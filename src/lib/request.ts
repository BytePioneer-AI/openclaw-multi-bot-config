import type {
  BotConfigRequest,
  Issue,
  RequestAgent,
  RequestOptions,
  RequestTarget,
  SessionPolicy
} from "./types.js";
import { readJsonFile } from "./files.js";
import { issue } from "./result.js";

const DEFAULT_OPTIONS: RequestOptions = {
  createBackup: true,
  preserveUnknownFields: true,
  allowBindingOverride: false,
  allowAgentWorkspaceReuse: true
};

const DEFAULT_SESSION_POLICY: SessionPolicy = {
  mode: "preserve"
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestShape(request: Record<string, unknown>) {
  const issues: Issue[] = [];

  if (request.version !== "1") {
    issues.push(issue("INVALID_REQUEST", "Request.version must be '1'", "error", "version"));
  }
  if (request.action !== "preview" && request.action !== "apply") {
    issues.push(issue("INVALID_REQUEST", "Request.action must be preview or apply", "error", "action"));
  }
  if (typeof request.configPath !== "string" || request.configPath.length === 0) {
    issues.push(issue("INVALID_REQUEST", "Request.configPath is required", "error", "configPath"));
  }
  if (request.operation !== "modify-existing-channel" && request.operation !== "add-channel") {
    issues.push(issue("INVALID_REQUEST", "Request.operation is invalid", "error", "operation"));
  }
  if (!Array.isArray(request.targets) || request.targets.length === 0) {
    issues.push(issue("INVALID_REQUEST", "Request.targets must be a non-empty array", "error", "targets"));
  }

  return issues;
}

function validateTargets(targets: RequestTarget[]) {
  const issues: Issue[] = [];
  const channelSet = new Set<string>();

  targets.forEach((target, targetIndex) => {
    if (target.channel.length === 0) {
      issues.push(issue("INVALID_REQUEST", "Target.channel is required", "error", `targets[${targetIndex}].channel`));
    }
    if (!["shared-agent", "isolated-agents", "hybrid"].includes(target.mode)) {
      issues.push(issue("INVALID_REQUEST", "Target.mode is invalid", "error", `targets[${targetIndex}].mode`));
    }
    if (channelSet.has(target.channel)) {
      issues.push(issue("INVALID_REQUEST", `Duplicate target channel: ${target.channel}`, "error", `targets[${targetIndex}].channel`));
    }
    channelSet.add(target.channel);

    const accountSet = new Set<string>();
    target.accounts.forEach((account, accountIndex) => {
      if (account.accountId.length === 0) {
        issues.push(
          issue("INVALID_REQUEST", "Account.accountId is required", "error", `targets[${targetIndex}].accounts[${accountIndex}].accountId`)
        );
      }
      if (accountSet.has(account.accountId)) {
        issues.push(
          issue(
            "INVALID_REQUEST",
            `Duplicate accountId in target ${target.channel}: ${account.accountId}`,
            "error",
            `targets[${targetIndex}].accounts[${accountIndex}].accountId`
          )
        );
      }
      accountSet.add(account.accountId);

      if (!isObject(account.credentials) || Object.keys(account.credentials).length === 0) {
        issues.push(
          issue(
            "INVALID_REQUEST",
            "Account.credentials must be a non-empty object",
            "error",
            `targets[${targetIndex}].accounts[${accountIndex}].credentials`
          )
        );
      }
    });

    if (target.defaultAccount && !target.accounts.some((account) => account.accountId === target.defaultAccount)) {
      issues.push(
        issue(
          "INVALID_REQUEST",
          `Target.defaultAccount must reference an account in the same target: ${target.defaultAccount}`,
          "error",
          `targets[${targetIndex}].defaultAccount`
        )
      );
    }
  });

  return issues;
}

function validateAgents(agents: RequestAgent[]) {
  const issues: Issue[] = [];
  const ids = new Set<string>();
  let defaultCount = 0;

  agents.forEach((agent, index) => {
    if (agent.id.length === 0) {
      issues.push(issue("INVALID_REQUEST", "Agent.id is required", "error", `agents[${index}].id`));
    }
    if (ids.has(agent.id)) {
      issues.push(issue("INVALID_REQUEST", `Duplicate agent id: ${agent.id}`, "error", `agents[${index}].id`));
    }
    ids.add(agent.id);

    if (agent.default) {
      defaultCount += 1;
    }
    if (agent.workspaceMode === "custom" && (!agent.workspace || agent.workspace.length === 0)) {
      issues.push(issue("INVALID_REQUEST", "Custom workspace mode requires workspace", "error", `agents[${index}].workspace`));
    }
  });

  if (defaultCount > 1) {
    issues.push(issue("INVALID_REQUEST", "Only one request agent may be marked as default", "error", "agents"));
  }

  return issues;
}

export async function loadRequest(requestPath: string): Promise<{ request: BotConfigRequest; issues: ReturnType<typeof issue>[] }> {
  const raw = await readJsonFile<Record<string, unknown>>(requestPath, "INVALID_REQUEST");
  const shapeIssues = validateRequestShape(raw);

  const targets = Array.isArray(raw.targets) ? (raw.targets as RequestTarget[]) : [];
  const agents = Array.isArray(raw.agents) ? (raw.agents as RequestAgent[]) : [];
  const sessionPolicy = isObject(raw.sessionPolicy)
    ? ({ ...DEFAULT_SESSION_POLICY, ...(raw.sessionPolicy as Record<string, unknown>) } as SessionPolicy)
    : DEFAULT_SESSION_POLICY;
  const options = isObject(raw.options)
    ? ({ ...DEFAULT_OPTIONS, ...(raw.options as Partial<RequestOptions>) } as RequestOptions)
    : DEFAULT_OPTIONS;

  const request: BotConfigRequest = {
    version: "1",
    action: raw.action as BotConfigRequest["action"],
    configPath: raw.configPath as string,
    operation: raw.operation as BotConfigRequest["operation"],
    targets: targets.map((target) => ({
      ...target,
      accounts: target.accounts.map((account) => ({
        ...account,
        enabled: account.enabled ?? true
      }))
    })),
    agents: agents.map((agent) => ({
      ...agent,
      workspaceMode: agent.workspaceMode ?? "auto"
    })),
    sessionPolicy,
    options
  };

  const targetIssues = validateTargets(request.targets);
  const agentIssues = validateAgents(request.agents);

  if (request.sessionPolicy.mode === "explicit" && (!request.sessionPolicy.dmScope || request.sessionPolicy.dmScope.length === 0)) {
    shapeIssues.push(issue("INVALID_REQUEST", "Explicit session policy requires dmScope", "error", "sessionPolicy.dmScope"));
  }

  return { request, issues: [...shapeIssues, ...targetIssues, ...agentIssues] };
}
