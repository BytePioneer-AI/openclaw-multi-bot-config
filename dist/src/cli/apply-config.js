import { parseArgs, optionalString, requireOption } from "../lib/args.js";
import { applyPlan } from "../lib/apply.js";
import { readJsonFile } from "../lib/files.js";
import { maskSecrets } from "../lib/mask-secrets.js";
import { runCli } from "../lib/output.js";
import { errorResult, okResult } from "../lib/result.js";
export async function main() {
    await runCli(async () => {
        const args = parseArgs(process.argv.slice(2));
        const planPath = requireOption(args, "plan");
        const configPath = requireOption(args, "config");
        const backupPath = optionalString(args, "backup");
        const plan = await readJsonFile(planPath, "INVALID_REQUEST");
        const result = await applyPlan(plan, configPath, backupPath);
        if (!result.ok) {
            return errorResult(result.code, result.message, result.issues);
        }
        return okResult("Plan applied", maskSecrets(result.data), result.issues);
    });
}
