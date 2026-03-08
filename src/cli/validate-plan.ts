import { parseArgs, requireOption } from "../lib/args.js";
import { readJsonFile } from "../lib/files.js";
import { maskSecrets } from "../lib/mask-secrets.js";
import { runCli } from "../lib/output.js";
import { errorResult, okResult } from "../lib/result.js";
import type { BotConfigPlan, OpenClawConfig } from "../lib/types.js";
import { validatePlan } from "../lib/validator.js";

export async function main(): Promise<void> {
  await runCli(async () => {
    const args = parseArgs(process.argv.slice(2));
    const planPath = requireOption(args, "plan");
    const configPath = requireOption(args, "config");
    const plan = await readJsonFile<BotConfigPlan>(planPath, "INVALID_REQUEST");
    const currentConfig = await readJsonFile<OpenClawConfig>(configPath);
    const validation = await validatePlan(plan, currentConfig);
    const errors = validation.issues.filter((entry) => entry.severity === "error");

    if (errors.length > 0) {
      return errorResult(errors[0]?.code ?? "PLAN_INVALID", errors[0]?.message ?? "Plan validation failed", [
        ...validation.issues,
        ...validation.warnings
      ]);
    }

    return okResult("Plan validation passed", {
      previewConfig: maskSecrets(validation.previewConfig),
      warnings: validation.warnings
    });
  });
}
