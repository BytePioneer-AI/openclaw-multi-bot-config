export type ResultCode =
  | "OK"
  | "INVALID_REQUEST"
  | "CONFIG_NOT_FOUND"
  | "CONFIG_INVALID_JSON"
  | "PLAN_INVALID"
  | "CHANNEL_UNSUPPORTED"
  | "CHANNEL_FIELDS_MISSING"
  | "PLAN_CONFLICT"
  | "WRITE_BLOCKED"
  | "APPLY_FAILED"
  | "ROLLBACK_FAILED"
  | "INTERNAL_ERROR";

export type Severity = "error" | "warning";

export interface Issue {
  code: ResultCode | string;
  message: string;
  severity: Severity;
  path?: string;
}

export interface ResultEnvelope<T = unknown> {
  ok: boolean;
  code: ResultCode | string;
  message: string;
  data?: T;
  issues?: Issue[];
}

export type RequestAction = "preview" | "apply";
export type RequestOperation = "modify-existing-channel" | "add-channel";
export type TargetMode = "shared-agent" | "isolated-agents" | "hybrid";
export type SessionPolicyMode = "preserve" | "recommended" | "explicit";
export type WorkspaceMode = "auto" | "custom" | "existing";

export interface RequestAccount {
  accountId: string;
  credentials: Record<string, unknown>;
  agentRef?: string;
  enabled?: boolean;
}

export interface RequestCredentialFields {
  requiredFields: string[];
  optionalFields?: string[];
}

export interface RequestTarget {
  channel: string;
  mode: TargetMode;
  defaultAccount?: string;
  accounts: RequestAccount[];
  credentialFields?: RequestCredentialFields;
}

export interface RequestAgent {
  id: string;
  default?: boolean;
  workspaceMode?: WorkspaceMode;
  workspace?: string;
}

export interface SessionPolicy {
  mode: SessionPolicyMode;
  dmScope?: string;
}

export interface RequestOptions {
  createBackup: boolean;
  preserveUnknownFields: boolean;
  allowBindingOverride: boolean;
  allowAgentWorkspaceReuse: boolean;
}

export interface BotConfigRequest {
  version: "1";
  action: RequestAction;
  configPath: string;
  operation: RequestOperation;
  targets: RequestTarget[];
  agents: RequestAgent[];
  sessionPolicy: SessionPolicy;
  options: RequestOptions;
}

export interface ChannelRegistryEntry {
  requiredFields: string[];
  optionalFields: string[];
  supportsAccounts: boolean;
  defaults?: Record<string, unknown>;
}

export type ChannelRegistry = Record<string, ChannelRegistryEntry>;

export interface PlanOperation {
  type: string;
  target: string;
  status: "create" | "update" | "replace" | "noop";
  reason: string;
}

export interface AgentBinding {
  agentId: string;
  match: {
    channel: string;
    accountId: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AgentConfig {
  id: string;
  default?: boolean;
  workspace?: string;
  [key: string]: unknown;
}

export interface ChannelAccountConfig extends Record<string, unknown> {}

export interface ChannelConfig extends Record<string, unknown> {
  defaultAccount?: string;
  accounts?: Record<string, ChannelAccountConfig>;
}

export interface OpenClawConfig extends Record<string, unknown> {
  agents?: {
    list?: AgentConfig[];
    defaults?: Record<string, unknown>;
    [key: string]: unknown;
  };
  bindings?: AgentBinding[];
  channels?: Record<string, ChannelConfig>;
  session?: {
    dmScope?: string;
    [key: string]: unknown;
  };
}

export interface ResolvedAccount extends RequestAccount {
  agentRef?: string;
  existing: boolean;
}

export interface ResolvedTarget {
  channel: string;
  mode: TargetMode;
  defaultAccount?: string;
  accounts: ResolvedAccount[];
  requiredFields: string[];
  optionalFields: string[];
  compatibilityMode: boolean;
  definitionSource: "registry" | "request" | "compatibility";
}

export interface ResolvedAgent extends AgentConfig {
  source: "request" | "generated" | "existing";
}

export interface PlanSummaryChannel {
  channel: string;
  mode: TargetMode;
  defaultAccount?: string;
  accountIds: string[];
}

export interface PlanSummaryAgent {
  id: string;
  default?: boolean;
  workspace?: string;
}

export interface PlanSummaryBinding {
  channel: string;
  accountId: string;
  agentId: string;
}

export interface PlanSummary {
  action: RequestAction;
  operation: RequestOperation;
  discoveredChannels: string[];
  channels: PlanSummaryChannel[];
  agents: PlanSummaryAgent[];
  bindings: PlanSummaryBinding[];
  dmScope: string | null;
  warnings: string[];
}

export interface BotConfigPlan {
  version: "1";
  configPath: string;
  summary: PlanSummary;
  resolved: {
    action: RequestAction;
    operation: RequestOperation;
    discoveredChannels: string[];
    options: RequestOptions;
    targets: ResolvedTarget[];
    agents: ResolvedAgent[];
    bindings: AgentBinding[];
    dmScope: string | null;
  };
  patch: Partial<OpenClawConfig>;
  operations: PlanOperation[];
  warnings: Issue[];
  errors: Issue[];
}
