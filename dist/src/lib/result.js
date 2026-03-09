export const EXIT_CODES = {
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
    code;
    issues;
    exitCode;
    constructor(code, message, issues = []) {
        super(message);
        this.code = code;
        this.issues = issues;
        this.exitCode = EXIT_CODES[code] ?? 10;
    }
}
export function okResult(message, data, issues = []) {
    return {
        ok: true,
        code: "OK",
        message,
        data,
        ...(issues.length > 0 ? { issues } : {})
    };
}
export function errorResult(code, message, issues = []) {
    return {
        ok: false,
        code,
        message,
        ...(issues.length > 0 ? { issues } : {})
    };
}
export function issue(code, message, severity, path) {
    return { code, message, severity, ...(path ? { path } : {}) };
}
