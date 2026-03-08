import { parseArgs, optionalString, requireOption } from "../lib/args.js";
import { createBackup } from "../lib/apply.js";
import { runCli } from "../lib/output.js";
import { okResult } from "../lib/result.js";

export async function main(): Promise<void> {
  await runCli(async () => {
    const args = parseArgs(process.argv.slice(2));
    const configPath = requireOption(args, "config");
    const backupDir = optionalString(args, "backup-dir");
    const backupPath = await createBackup(configPath, backupDir);
    return okResult("Backup created", { backupPath });
  });
}
