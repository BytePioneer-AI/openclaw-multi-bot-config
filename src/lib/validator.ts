import type { BotConfigPlan, ChannelConfig, Issue, OpenClawConfig } from "./types.js";
import { issue } from "./result.js";
import { mergeConfig } from "./merge.js";

function validatePlanShape(plan: BotConfigPlan) {
  const issues: Issue[] = [];

  if (plan.version !== "1") {
    issues.push(issue("PLAN_INVALID", "Plan.version must be '1'", "error", "version"));
  }
  if (!plan.summary || !plan.resolved || !plan.patch) {
    issues.push(issue("PLAN_INVALID", "Plan is missing summary, resolved, or patch blocks", "error"));
  }
  if (!Array.isArray(plan.operations)) {
    issues.push(issue("PLAN_INVALID", "Plan.operations must be an array", "error", "operations"));
  }

  return issues;
}

function validateDefaultAccount(targetChannel: ChannelConfig, channelName: string) {
  const issues: Issue[] = [];
  if (!targetChannel.defaultAccount) {
    return issues;
  }

  if (!targetChannel.accounts?.[targetChannel.defaultAccount]) {
    issues.push(
      issue(
        "PLAN_INVALID",
        `Default account '${targetChannel.defaultAccount}' does not exist for channel '${channelName}'`,
        "error",
        `channels.${channelName}.defaultAccount`
      )
    );
  }

  return issues;
}

export async function validatePlan(plan: BotConfigPlan, currentConfig: OpenClawConfig) {
  const issues = [...validatePlanShape(plan), ...plan.errors];
  const warnings = [...plan.warnings];

  for (const resolvedTarget of plan.resolved.targets) {
    const accountIds = new Set<string>();
    for (const account of resolvedTarget.accounts) {
      if (accountIds.has(account.accountId)) {
        issues.push(
          issue(
            "PLAN_INVALID",
            `Duplicate accountId '${account.accountId}' in channel '${resolvedTarget.channel}'`,
            "error",
            `targets.${resolvedTarget.channel}.accounts.${account.accountId}`
          )
        );
      }
      accountIds.add(account.accountId);
    }
  }

  const previewConfig = mergeConfig(currentConfig, plan);

  for (const resolvedTarget of plan.resolved.targets) {
    const finalChannel = previewConfig.channels?.[resolvedTarget.channel];
    if (!finalChannel) {
      issues.push(issue("PLAN_INVALID", `Planned channel '${resolvedTarget.channel}' is missing after merge preview`, "error"));
      continue;
    }

    issues.push(...validateDefaultAccount(finalChannel, resolvedTarget.channel));
    for (const account of resolvedTarget.accounts) {
      const mergedAccount = finalChannel.accounts?.[account.accountId];
      for (const field of resolvedTarget.requiredFields) {
        if (mergedAccount?.[field] === undefined || mergedAccount[field] === null || mergedAccount[field] === "") {
          issues.push(
            issue(
              "CHANNEL_FIELDS_MISSING",
              `Missing required field '${field}' for ${resolvedTarget.channel}.${account.accountId}`,
              "error",
              `channels.${resolvedTarget.channel}.accounts.${account.accountId}.${field}`
            )
          );
        }
      }
    }
  }

  const managedDefaultAgents = plan.resolved.agents.filter((agent) => agent.default);
  if (managedDefaultAgents.length > 1) {
    issues.push(issue("PLAN_INVALID", "Only one managed agent may be default", "error", "agents"));
  }

  const workspaceOwners = new Map<string, string>();
  for (const existingAgent of previewConfig.agents?.list ?? []) {
    if (!existingAgent.workspace) {
      continue;
    }

    const owner = workspaceOwners.get(existingAgent.workspace);
    if (owner && owner !== existingAgent.id && !plan.resolved.options.allowAgentWorkspaceReuse) {
      issues.push(
        issue(
          "PLAN_CONFLICT",
          `Workspace '${existingAgent.workspace}' is shared by '${owner}' and '${existingAgent.id}'`,
          "error",
          `agents.${existingAgent.id}.workspace`
        )
      );
    }
    workspaceOwners.set(existingAgent.workspace, existingAgent.id);
  }

  const currentBindings = new Map(
    (currentConfig.bindings ?? []).map((binding) => [`${binding.match?.channel}::${binding.match?.accountId}`, binding.agentId])
  );

  for (const binding of plan.resolved.bindings) {
    const key = `${binding.match.channel}::${binding.match.accountId}`;
    const existingAgentId = currentBindings.get(key);
    if (existingAgentId && existingAgentId !== binding.agentId && !plan.resolved.options.allowBindingOverride) {
      issues.push(
        issue(
          "PLAN_CONFLICT",
          `Binding conflict for ${binding.match.channel}.${binding.match.accountId}: existing agent '${existingAgentId}', planned agent '${binding.agentId}'`,
          "error",
          `bindings.${binding.match.channel}.${binding.match.accountId}`
        )
      );
    }
  }

  if (
    plan.resolved.operation === "modify-existing-channel" &&
    plan.resolved.targets.some((target) => !currentConfig.channels?.[target.channel])
  ) {
    issues.push(issue("PLAN_INVALID", "Modify-existing-channel requires the target channel to exist", "error", "operation"));
  }

  if (plan.resolved.operation === "add-channel" && plan.resolved.targets.some((target) => currentConfig.channels?.[target.channel])) {
    warnings.push(issue("PLAN_INVALID", "Requested add-channel for an existing channel; the merge will update it in place", "warning", "operation"));
  }

  return {
    issues,
    warnings,
    previewConfig
  };
}
