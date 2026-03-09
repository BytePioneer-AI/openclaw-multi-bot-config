import type {
  AgentBinding,
  BotConfigPlan,
  BotConfigRequest,
  ChannelConfig,
  OpenClawConfig,
  PlanOperation,
  RequestAgent,
  Issue,
  ResolvedAgent,
  ResolvedTarget
} from "./types.js";
import { issue } from "./result.js";
import { buildAutoWorkspace, sanitizeIdentifier } from "./paths.js";
import { loadChannelRegistry, resolveChannelDefinition } from "./registry.js";

function createOperation(type: string, target: string, status: PlanOperation["status"], reason: string): PlanOperation {
  return { type, target, status, reason };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function resolveDmScope(request: BotConfigRequest, currentConfig: OpenClawConfig): string | null {
  if (request.sessionPolicy.mode === "preserve") {
    return currentConfig.session?.dmScope ?? null;
  }

  if (request.sessionPolicy.mode === "explicit") {
    return request.sessionPolicy.dmScope ?? null;
  }

  const multiAccount = request.targets.some((target) => target.accounts.length > 1);
  const multiTarget = request.targets.length > 1;

  if (multiAccount || multiTarget) {
    return "per-account-channel-peer";
  }

  return currentConfig.session?.dmScope ?? null;
}

function determineDefaultAccount(target: BotConfigRequest["targets"][number], currentChannel: ChannelConfig | undefined): string | undefined {
  return target.defaultAccount ?? currentChannel?.defaultAccount ?? target.accounts[0]?.accountId;
}

function createResolvedAgent(
  requestedAgent: RequestAgent | undefined,
  agentId: string,
  currentConfigPath: string,
  currentConfig: OpenClawConfig
): ResolvedAgent {
  const currentAgent = currentConfig.agents?.list?.find((agent) => agent.id === agentId);
  const workspaceMode = requestedAgent?.workspaceMode ?? "auto";
  const workspace =
    workspaceMode === "custom"
      ? requestedAgent?.workspace
      : workspaceMode === "existing"
        ? currentAgent?.workspace
        : currentAgent?.workspace ?? buildAutoWorkspace(currentConfigPath, agentId);

  return {
    id: agentId,
    ...(requestedAgent?.default !== undefined ? { default: requestedAgent.default } : currentAgent?.default !== undefined ? { default: currentAgent.default } : {}),
    ...(workspace ? { workspace } : {}),
    source: requestedAgent ? "request" : currentAgent ? "existing" : "generated"
  };
}

function resolveAccountAgentRef(
  targetMode: ResolvedTarget["mode"],
  channel: string,
  accountId: string,
  incomingAgentRef: string | undefined,
  request: BotConfigRequest,
  currentConfig: OpenClawConfig
): string | undefined {
  if (incomingAgentRef) {
    return incomingAgentRef;
  }

  if (targetMode === "shared-agent") {
    if (request.agents.length === 1) {
      return request.agents[0]?.id;
    }

    return currentConfig.agents?.list?.find((agent) => agent.default)?.id;
  }

  return sanitizeIdentifier(`${channel}-${accountId}`);
}

export async function generatePlan(request: BotConfigRequest, currentConfig: OpenClawConfig): Promise<BotConfigPlan> {
  const registry = await loadChannelRegistry();
  const discoveredChannels = Object.keys(currentConfig.channels ?? {}).sort();
  const warnings: Issue[] = [];
  const errors: Issue[] = [];
  const operations: PlanOperation[] = [];
  const patch: BotConfigPlan["patch"] = {};
  const resolvedTargets: ResolvedTarget[] = [];
  const bindingMap = new Map<string, AgentBinding>();
  const requestedAgentsById = new Map(request.agents.map((agent) => [agent.id, agent]));
  const managedAgents = new Map<string, ResolvedAgent>();

  for (const target of request.targets) {
    const currentChannel = currentConfig.channels?.[target.channel];
    const channelDefinition = resolveChannelDefinition(target.channel, registry, currentConfig, target.credentialFields);

    if (!channelDefinition) {
      errors.push(
        issue(
          "CHANNEL_UNSUPPORTED",
          `Unsupported new channel '${target.channel}'. Add it to channel_registry.json, provide credentialFields, or extend an existing configured channel.`,
          "error",
          `targets.${target.channel}`
        )
      );
      continue;
    }

    if (request.operation === "modify-existing-channel" && !currentChannel) {
      errors.push(
        issue("PLAN_INVALID", `Channel '${target.channel}' does not exist in the current config`, "error", `targets.${target.channel}`)
      );
    }

    const defaultAccount = determineDefaultAccount(target, currentChannel);
    const resolvedAccounts = target.accounts.map((account) => {
      const agentRef = resolveAccountAgentRef(target.mode, target.channel, account.accountId, account.agentRef, request, currentConfig);
      if (agentRef) {
        managedAgents.set(agentRef, createResolvedAgent(requestedAgentsById.get(agentRef), agentRef, request.configPath, currentConfig));
      }

      return {
        ...clone(account),
        ...(agentRef ? { agentRef } : {}),
        existing: Boolean(currentChannel?.accounts?.[account.accountId])
      };
    });

    const patchChannel: ChannelConfig = {
      ...(channelDefinition.defaults ?? {}),
      ...(currentChannel ? clone(currentChannel) : {}),
      accounts: {
        ...(currentChannel?.accounts ? clone(currentChannel.accounts) : {})
      }
    };

    for (const account of resolvedAccounts) {
      patchChannel.accounts ??= {};
      patchChannel.accounts[account.accountId] = {
        ...(currentChannel?.accounts?.[account.accountId] ? clone(currentChannel.accounts[account.accountId]) : {}),
        ...clone(account.credentials)
      };

      operations.push(
        createOperation(
          "update-channel-account",
          `${target.channel}.${account.accountId}`,
          currentChannel?.accounts?.[account.accountId] ? "update" : "create",
          currentChannel?.accounts?.[account.accountId] ? "Update existing channel account" : "Create new channel account"
        )
      );

      if (target.mode !== "shared-agent" && account.agentRef) {
        bindingMap.set(`${target.channel}::${account.accountId}`, {
          agentId: account.agentRef,
          match: {
            channel: target.channel,
            accountId: account.accountId
          }
        });
      }
    }

    if (defaultAccount) {
      patchChannel.defaultAccount = defaultAccount;
      operations.push(
        createOperation(
          "set-default-account",
          `${target.channel}.defaultAccount`,
          currentChannel?.defaultAccount ? "update" : "create",
          "Set or update channel default account"
        )
      );
    }

    patch.channels ??= {};
    patch.channels[target.channel] = patchChannel;
    resolvedTargets.push({
      channel: target.channel,
      mode: target.mode,
      defaultAccount,
      accounts: resolvedAccounts,
      requiredFields: channelDefinition.requiredFields,
      optionalFields: channelDefinition.optionalFields,
      compatibilityMode: channelDefinition.compatibilityMode,
      definitionSource: channelDefinition.source
    });
  }

  const resolvedAgents = [...managedAgents.values()].sort((left, right) => left.id.localeCompare(right.id));
  const explicitDefaultAgents = resolvedAgents.filter((agent) => agent.default);

  if (explicitDefaultAgents.length > 1) {
    errors.push(issue("PLAN_INVALID", "More than one managed agent is marked as default", "error", "agents"));
  }

  if (explicitDefaultAgents.length === 0 && resolvedAgents.length > 0) {
    const existingDefaultAgentId = currentConfig.agents?.list?.find((agent) => agent.default)?.id;
    const preservedDefault = existingDefaultAgentId ? resolvedAgents.find((agent) => agent.id === existingDefaultAgentId) : undefined;
    if (preservedDefault) {
      preservedDefault.default = true;
    } else if (!existingDefaultAgentId) {
      resolvedAgents[0].default = true;
    }
  }

  if (resolvedAgents.length > 0) {
    patch.agents = {
      ...(currentConfig.agents ? clone(currentConfig.agents) : {}),
      list: resolvedAgents.map((agent) => {
        operations.push(
          createOperation(
            "upsert-agent",
            `agents.list.${agent.id}`,
            currentConfig.agents?.list?.some((currentAgent) => currentAgent.id === agent.id) ? "update" : "create",
            "Create or update managed agent"
          )
        );
        return clone(agent);
      })
    };
  }

  const bindings = [...bindingMap.values()].sort((left, right) => {
    const leftKey = `${left.match.channel}:${left.match.accountId}:${left.agentId}`;
    const rightKey = `${right.match.channel}:${right.match.accountId}:${right.agentId}`;
    return leftKey.localeCompare(rightKey);
  });

  if (bindings.length > 0) {
    patch.bindings = bindings;
    bindings.forEach((binding) => {
      operations.push(
        createOperation(
          "set-binding",
          `${binding.match.channel}.${binding.match.accountId}`,
          currentConfig.bindings?.some(
            (currentBinding) =>
              currentBinding.match?.channel === binding.match.channel && currentBinding.match?.accountId === binding.match.accountId
          )
            ? "replace"
            : "create",
          "Route channel account to managed agent"
        )
      );
    });
  }

  const dmScope = resolveDmScope(request, currentConfig);
  if (dmScope) {
    patch.session = {
      ...(currentConfig.session ? clone(currentConfig.session) : {}),
      dmScope
    };
    if (currentConfig.session?.dmScope !== dmScope) {
      operations.push(
        createOperation(
          "set-dm-scope",
          "session.dmScope",
          currentConfig.session?.dmScope ? "update" : "create",
          "Set or update direct-message scope"
        )
      );
    }
  }

  const summary = {
    action: request.action,
    operation: request.operation,
    discoveredChannels,
    channels: resolvedTargets.map((target) => ({
      channel: target.channel,
      mode: target.mode,
      defaultAccount: target.defaultAccount,
      accountIds: target.accounts.map((account) => account.accountId)
    })),
    agents: resolvedAgents.map((agent) => ({
      id: agent.id,
      ...(agent.default !== undefined ? { default: agent.default } : {}),
      ...(agent.workspace ? { workspace: agent.workspace } : {})
    })),
    bindings: bindings.map((binding) => ({
      channel: binding.match.channel,
      accountId: String(binding.match.accountId),
      agentId: binding.agentId
    })),
    dmScope,
    warnings: warnings.map((warning) => warning.message)
  };

  return {
    version: "1",
    configPath: request.configPath,
    summary,
    resolved: {
      action: request.action,
      operation: request.operation,
      discoveredChannels,
      options: clone(request.options),
      targets: resolvedTargets,
      agents: resolvedAgents,
      bindings,
      dmScope
    },
    patch,
    operations,
    warnings,
    errors
  };
}
