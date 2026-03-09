import { parseArgs, optionalString, requireOption } from "../lib/args.js";
import { readJsonFile, writeJsonFileAtomic } from "../lib/files.js";
import { maskSecrets } from "../lib/mask-secrets.js";
import { runCli } from "../lib/output.js";
import { generatePlan } from "../lib/planner.js";
import { loadRequest } from "../lib/request.js";
import { CliError, okResult } from "../lib/result.js";
export async function main() {
    await runCli(async () => {
        const args = parseArgs(process.argv.slice(2));
        const requestPath = requireOption(args, "request");
        const configPath = requireOption(args, "config");
        const outPath = optionalString(args, "out");
        const { request, issues } = await loadRequest(requestPath);
        if (issues.length > 0) {
            throw new CliError("INVALID_REQUEST", "Request validation failed", issues);
        }
        const currentConfig = await readJsonFile(configPath);
        const plan = await generatePlan({ ...request, configPath }, currentConfig);
        if (outPath) {
            await writeJsonFileAtomic(outPath, plan);
        }
        return okResult("Plan generated", {
            plan,
            preview: maskSecrets({
                summary: plan.summary,
                patch: plan.patch,
                warnings: plan.warnings,
                errors: plan.errors
            }),
            ...(outPath ? { planPath: outPath } : {})
        });
    });
}
