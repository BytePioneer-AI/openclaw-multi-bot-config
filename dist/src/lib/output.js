import { CliError, errorResult, EXIT_CODES } from "./result.js";
export function writeEnvelope(envelope) {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}
export async function runCli(handler) {
    try {
        const envelope = await handler();
        writeEnvelope(envelope);
        process.exit(envelope.ok ? 0 : EXIT_CODES[envelope.code] ?? 10);
    }
    catch (error) {
        if (error instanceof CliError) {
            writeEnvelope(errorResult(error.code, error.message, error.issues));
            process.exit(error.exitCode);
            return;
        }
        const message = error instanceof Error ? error.message : String(error);
        writeEnvelope(errorResult("INTERNAL_ERROR", message));
        process.exit(EXIT_CODES.INTERNAL_ERROR);
    }
}
