import { CliError, issue } from "./result.js";

export interface ParsedArgs {
  options: Map<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const options = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (next === undefined || next.startsWith("--")) {
      options.set(key, true);
      continue;
    }

    options.set(key, next);
    index += 1;
  }

  return { options };
}

export function requireOption(args: ParsedArgs, key: string): string {
  const value = args.options.get(key);
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new CliError("INVALID_REQUEST", `Missing required option --${key}`, [
    issue("INVALID_REQUEST", `Missing required option --${key}`, "error", `--${key}`)
  ]);
}

export function optionalString(args: ParsedArgs, key: string): string | undefined {
  const value = args.options.get(key);
  return typeof value === "string" ? value : undefined;
}
