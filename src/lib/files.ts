import fs from "node:fs/promises";
import path from "node:path";
import { CliError, issue } from "./result.js";

export async function readJsonFile<T>(
  filePath: string,
  notFoundCode: "CONFIG_NOT_FOUND" | "INVALID_REQUEST" = "CONFIG_NOT_FOUND"
): Promise<T> {
  let raw: string;

  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CliError(notFoundCode, `JSON file not found: ${filePath}`, [
        issue(notFoundCode, `JSON file not found: ${filePath}`, "error", filePath)
      ]);
    }
    throw error;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new CliError("CONFIG_INVALID_JSON", `Invalid JSON in ${filePath}: ${(error as Error).message}`, [
      issue("CONFIG_INVALID_JSON", `Invalid JSON in ${filePath}`, "error", filePath)
    ]);
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJsonFileAtomic(filePath: string, value: unknown): Promise<void> {
  const dirPath = path.dirname(filePath);
  await ensureDir(dirPath);
  const tempPath = path.join(dirPath, `${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(tempPath, contents, "utf8");
  await readJsonFile<Record<string, unknown>>(tempPath, "INVALID_REQUEST");
  await fs.rename(tempPath, filePath);
}

export async function copyFile(sourcePath: string, destinationPath: string): Promise<void> {
  await ensureDir(path.dirname(destinationPath));
  await fs.copyFile(sourcePath, destinationPath);
}

export function timestampForFilename(date: Date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
