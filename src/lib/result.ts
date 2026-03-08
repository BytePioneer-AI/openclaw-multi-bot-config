import type { Issue, ResultCode, ResultEnvelope } from "./types.js";

export const EXIT_CODES: Record<string, number> = {
  OK: 0,
  INVALID_REQUEST: 2,
  CONFIG_NOT_FOUND: 3,
  CONFIG_INVALID_JSON: 3,
  PLAN_INVALID: 4,
  CHANNEL_UNSUPPORTED: 4,
  CHANNEL_FIELDS_MISSING: 4,
  PLAN_CONFLICT: 4,
  WRITE_BLOCKED: 5,
  APPLY_FAILED: 5,
  ROLLBACK_FAILED: 6,
  INTERNAL_ERROR: 10
};

export class CliError extends Error {
  readonly code: ResultCode | string;
  readonly issues: Issue[];
  readonly exitCode: number;

  constructor(code: ResultCode | string, message: string, issues: Issue[] = []) {
    super(message);
    this.code = code;
    this.issues = issues;
    this.exitCode = EXIT_CODES[code] ?? 10;
  }
}

export function okResult<T>(message: string, data?: T, issues: Issue[] = []): ResultEnvelope<T> {
  return {
    ok: true,
    code: "OK",
    message,
    data,
    ...(issues.length > 0 ? { issues } : {})
  };
}

export function errorResult<T>(code: ResultCode | string, message: string, issues: Issue[] = []): ResultEnvelope<T> {
  return {
    ok: false,
    code,
    message,
    ...(issues.length > 0 ? { issues } : {})
  };
}

export function issue(
  code: ResultCode | string,
  message: string,
  severity: "error" | "warning",
  path?: string
): Issue {
  return { code, message, severity, ...(path ? { path } : {}) };
}
