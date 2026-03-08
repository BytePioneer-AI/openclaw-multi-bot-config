import path from "node:path";
import { fileURLToPath } from "node:url";

export function getSkillRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

export function getScriptsDir(): string {
  return path.join(getSkillRoot(), "scripts");
}

export function sanitizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildAutoWorkspace(configPath: string, agentId: string): string {
  return path.join(path.dirname(configPath), `workspace-${sanitizeIdentifier(agentId)}`);
}
