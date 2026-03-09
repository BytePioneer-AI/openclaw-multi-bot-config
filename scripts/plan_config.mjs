#!/usr/bin/env node
import {
  buildPlan,
  maskSecrets,
  okResult,
  optionalOption,
  parseArgs,
  readJsonFile,
  requireOption,
  runCli,
  writeJsonFileAtomic
} from "./config_core.mjs";

export async function main() {
  await runCli(async () => {
    const args = parseArgs(process.argv.slice(2));
    const requestPath = requireOption(args, "request");
    const configPath = optionalOption(args, "config");
    const outPath = optionalOption(args, "out");
    const request = await readJsonFile(requestPath, "INVALID_REQUEST");
    const currentConfig = await readJsonFile(configPath ?? request.configPath);
    const plan = buildPlan(request, currentConfig, configPath);

    if (outPath) {
      await writeJsonFileAtomic(outPath, plan);
    }

    return okResult("Plan generated", {
      plan,
      preview: {
        summary: plan.summary,
        patch: maskSecrets(plan.patch),
        mergedConfig: maskSecrets(plan.mergedConfig),
        warnings: plan.warnings
      },
      ...(outPath ? { planPath: outPath } : {})
    });
  });
}

await main();
