import fs from "node:fs/promises";
import path from "node:path";
import { copyFile, ensureDir, readJsonFile, timestampForFilename, writeJsonFileAtomic } from "./files.js";
import { issue } from "./result.js";
import { maskSecrets } from "./mask-secrets.js";
import { mergeConfig } from "./merge.js";
import { validatePlan } from "./validator.js";
export async function createBackup(configPath, backupDir) {
    const directory = backupDir ?? path.join(path.dirname(configPath), "backups", "openclaw-bot-config");
    await ensureDir(directory);
    const backupPath = path.join(directory, `openclaw-${timestampForFilename()}.json.bak`);
    await copyFile(configPath, backupPath);
    return backupPath;
}
export async function applyPlan(plan, configPath, backupPath) {
    const currentConfig = await readJsonFile(configPath);
    const validation = await validatePlan(plan, currentConfig);
    const validationErrors = validation.issues.filter((entry) => entry.severity === "error");
    if (validationErrors.length > 0) {
        return {
            ok: false,
            code: validationErrors[0]?.code ?? "PLAN_INVALID",
            message: validationErrors[0]?.message ?? "Plan validation failed",
            issues: validation.issues
        };
    }
    const effectiveBackupPath = backupPath ?? (plan.resolved.options.createBackup ? await createBackup(configPath) : undefined);
    const mergedConfig = mergeConfig(currentConfig, plan);
    await writeJsonFileAtomic(configPath, mergedConfig);
    return {
        ok: true,
        code: "OK",
        message: "Plan applied",
        data: {
            backupPath: effectiveBackupPath,
            summary: maskSecrets(plan.summary),
            verificationCommands: [
                "openclaw gateway restart",
                "openclaw agents list --bindings",
                "openclaw channels status --probe"
            ]
        },
        issues: validation.warnings
    };
}
export async function rollbackConfig(configPath, backupPath) {
    const rawBackup = await fs.readFile(backupPath, "utf8");
    const parsedBackup = JSON.parse(rawBackup);
    await writeJsonFileAtomic(configPath, parsedBackup);
    return {
        ok: true,
        code: "OK",
        message: "Rollback completed",
        data: {
            backupPath,
            verificationCommands: [
                "openclaw gateway restart",
                "openclaw agents list --bindings",
                "openclaw channels status --probe"
            ]
        },
        issues: [issue("OK", "Restored configuration from backup", "warning", backupPath)]
    };
}
