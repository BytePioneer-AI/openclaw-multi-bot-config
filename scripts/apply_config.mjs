#!/usr/bin/env node
import {
  applyPlan,
  maskSecrets,
  okResult,
  optionalOption,
  parseArgs,
  readJsonFile,
  requireOption,
  runCli
} from "./config_core.mjs";

export async function main() {
  await runCli(async () => {
    const args = parseArgs(process.argv.slice(2));
    const planPath = requireOption(args, "plan");
    const configPath = optionalOption(args, "config");
    const backupPath = optionalOption(args, "backup");
    const plan = await readJsonFile(planPath, "INVALID_REQUEST");
    const result = await applyPlan(plan, configPath, backupPath);

    return okResult("Plan applied", {
      backupPath: result.backupPath,
      summary: maskSecrets(plan.summary),
      verificationCommands: [
        "openclaw gateway restart",
        "openclaw agents list --bindings",
        "openclaw channels status --probe"
      ]
    });
  });
}

await main();
