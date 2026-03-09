import { parseArgs, requireOption } from "../lib/args.js";
import { rollbackConfig } from "../lib/apply.js";
import { maskSecrets } from "../lib/mask-secrets.js";
import { runCli } from "../lib/output.js";
import { okResult } from "../lib/result.js";
export async function main() {
    await runCli(async () => {
        const args = parseArgs(process.argv.slice(2));
        const configPath = requireOption(args, "config");
        const backupPath = requireOption(args, "backup");
        const result = await rollbackConfig(configPath, backupPath);
        return okResult("Rollback completed", maskSecrets(result.data), result.issues);
    });
}
//# sourceMappingURL=rollback-config.js.map