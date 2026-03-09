#!/usr/bin/env node
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const entry = new URL("../dist/src/cli/validate-plan.js", import.meta.url);

try {
  await access(fileURLToPath(entry));
  const module = await import(entry);
  await module.main();
} catch (error) {
  console.error(`openclaw-multi-bot-config: unable to run validate_plan (${error instanceof Error ? error.message : String(error)})`);
  console.error("Build the skill first with `pnpm --dir openclaw-multi-bot-config build`.");
  process.exit(10);
}
