import fs from "node:fs/promises";
import path from "node:path";

const EXIT_CODES = {
  OK: 0,
  INVALID_REQUEST: 2,
  CONFIG_NOT_FOUND: 3,
  CONFIG_INVALID_JSON: 3,
  APPLY_FAILED: 5,
  INTERNAL_ERROR: 10
};

function issue(code, message, pathName) {
  return {
    code,
    message,
    ...(pathName ? { path: pathName } : {})
  };
}

function clone(value) {
  return structuredClone(value);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maskSecretValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  if (value.length <= 6) {
    return "***";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function shouldMaskKey(key) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("secret") ||
    normalized.includes("token") ||
    normalized.includes("password") ||
    normalized === "key" ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("accesskey") ||
    normalized.endsWith("privatekey") ||
    normalized.endsWith("secretkey") ||
    normalized.endsWith("aeskey")
  );
}

export function maskSecrets(value) {
  if (Array.isArray(value)) {
    return value.map(maskSecrets);
  }

  if (!isObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      shouldMaskKey(key) ? maskSecretValue(entry) : maskSecrets(entry)
    ])
  );
}

export function parseArgs(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }

    args.set(key, next);
    index += 1;
  }

  return args;
}

export function requireOption(args, name) {
  const value = args.get(name);
  if (!value) {
    throw createCliError("INVALID_REQUEST", `Missing required option --${name}`, [issue("INVALID_REQUEST", `Missing required option --${name}`)]);
  }
  return value;
}

export function optionalOption(args, name) {
  return args.get(name);
}

export async function readJsonFile(filePath, notFoundCode = "CONFIG_NOT_FOUND") {
  let raw;

  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw createCliError(notFoundCode, `JSON file not found: ${filePath}`, [issue(notFoundCode, `JSON file not found: ${filePath}`, filePath)]);
    }

    throw error;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createCliError("CONFIG_INVALID_JSON", `Invalid JSON in ${filePath}: ${message}`, [issue("CONFIG_INVALID_JSON", `Invalid JSON in ${filePath}`, filePath)]);
  }
}

export async function writeJsonFileAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const tempPath = path.join(directory, `${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`);
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await readJsonFile(tempPath, "INVALID_REQUEST");
  await fs.rename(tempPath, filePath);
}

export async function createBackup(configPath, requestedBackupPath) {
  const targetPath =
    requestedBackupPath ??
    path.join(
      path.dirname(configPath),
      "backups",
      "openclaw-multi-bot-config",
      `openclaw-${timestampForFilename()}.json.bak`
    );

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(configPath, targetPath);
  return targetPath;
}

function timestampForFilename(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ];
  const time = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ];
  return `${parts.join("")}-${time.join("")}`;
}

function createCliError(code, message, issues = []) {
  return Object.assign(new Error(message), {
    code,
    issues,
    exitCode: EXIT_CODES[code] ?? EXIT_CODES.INTERNAL_ERROR
  });
}

function validateAgentEntry(agent, index) {
  const issues = [];

  if (!isObject(agent)) {
    issues.push(issue("INVALID_REQUEST", "agents.list items must be objects", `patch.agents.list[${index}]`));
    return issues;
  }

  if (typeof agent.id !== "string" || agent.id.length === 0) {
    issues.push(issue("INVALID_REQUEST", "Agent id is required", `patch.agents.list[${index}].id`));
  }

  if (agent.workspace !== undefined && (typeof agent.workspace !== "string" || agent.workspace.length === 0)) {
    issues.push(issue("INVALID_REQUEST", "Agent workspace must be a non-empty string when provided", `patch.agents.list[${index}].workspace`));
  }

  if (agent.default !== undefined && typeof agent.default !== "boolean") {
    issues.push(issue("INVALID_REQUEST", "Agent default must be boolean when provided", `patch.agents.list[${index}].default`));
  }

  return issues;
}

function normalizeRequest(rawRequest, configPathOverride) {
  if (!isObject(rawRequest)) {
    throw createCliError("INVALID_REQUEST", "Request must be a JSON object", [issue("INVALID_REQUEST", "Request must be a JSON object")]);
  }

  const issues = [];
  const configPath =
    typeof configPathOverride === "string" && configPathOverride.length > 0
      ? configPathOverride
      : typeof rawRequest.configPath === "string" && rawRequest.configPath.length > 0
        ? rawRequest.configPath
        : null;

  if (!configPath) {
    issues.push(issue("INVALID_REQUEST", "Request.configPath is required", "configPath"));
  }

  const patch = rawRequest.patch;
  if (!isObject(patch)) {
    issues.push(issue("INVALID_REQUEST", "Request.patch must be an object", "patch"));
  }

  const allowedPatchKeys = new Set(["agents", "channels", "bindings", "session"]);
  if (isObject(patch)) {
    for (const key of Object.keys(patch)) {
      if (!allowedPatchKeys.has(key)) {
        issues.push(issue("INVALID_REQUEST", `Unsupported patch key '${key}'. Only agents, channels, bindings, and session are allowed`, `patch.${key}`));
      }
    }
  }

  const normalizedPatch = {};

  if (isObject(patch?.agents)) {
    const agents = patch.agents;
    for (const key of Object.keys(agents)) {
      if (key !== "list") {
        issues.push(issue("INVALID_REQUEST", `Unsupported agents key '${key}'. Only agents.list is managed`, `patch.agents.${key}`));
      }
    }

    if (agents.list !== undefined) {
      if (!Array.isArray(agents.list)) {
        issues.push(issue("INVALID_REQUEST", "patch.agents.list must be an array", "patch.agents.list"));
      } else {
        const ids = new Set();
        const entries = agents.list.map((entry) => clone(entry));
        entries.forEach((entry, index) => {
          validateAgentEntry(entry, index).forEach((entryIssue) => issues.push(entryIssue));
          if (typeof entry.id === "string" && entry.id.length > 0) {
            if (ids.has(entry.id)) {
              issues.push(issue("INVALID_REQUEST", `Duplicate agent id '${entry.id}'`, `patch.agents.list[${index}].id`));
            }
            ids.add(entry.id);
          }
        });

        normalizedPatch.agents = { list: entries };
      }
    }
  } else if (patch?.agents !== undefined) {
    issues.push(issue("INVALID_REQUEST", "patch.agents must be an object", "patch.agents"));
  }

  if (isObject(patch?.channels)) {
    const channels = {};

    for (const [channelId, channelConfig] of Object.entries(patch.channels)) {
      if (!isObject(channelConfig)) {
        issues.push(issue("INVALID_REQUEST", `patch.channels.${channelId} must be an object`, `patch.channels.${channelId}`));
        continue;
      }
      channels[channelId] = clone(channelConfig);
    }

    normalizedPatch.channels = channels;
  } else if (patch?.channels !== undefined) {
    issues.push(issue("INVALID_REQUEST", "patch.channels must be an object", "patch.channels"));
  }

  if (patch?.bindings !== undefined) {
    if (!Array.isArray(patch.bindings)) {
      issues.push(issue("INVALID_REQUEST", "patch.bindings must be an array", "patch.bindings"));
    } else {
      normalizedPatch.bindings = clone(patch.bindings);
    }
  }

  if (isObject(patch?.session)) {
    const session = patch.session;
    for (const key of Object.keys(session)) {
      if (key !== "dmScope") {
        issues.push(issue("INVALID_REQUEST", `Unsupported session key '${key}'. Only session.dmScope is managed`, `patch.session.${key}`));
      }
    }

    if (session.dmScope !== undefined && (typeof session.dmScope !== "string" || session.dmScope.length === 0)) {
      issues.push(issue("INVALID_REQUEST", "session.dmScope must be a non-empty string when provided", "patch.session.dmScope"));
    } else if (session.dmScope !== undefined) {
      normalizedPatch.session = { dmScope: session.dmScope };
    }
  } else if (patch?.session !== undefined) {
    issues.push(issue("INVALID_REQUEST", "patch.session must be an object", "patch.session"));
  }

  if (Object.keys(normalizedPatch).length === 0) {
    issues.push(issue("INVALID_REQUEST", "Request.patch must include at least one managed block", "patch"));
  }

  if (issues.length > 0) {
    throw createCliError("INVALID_REQUEST", "Request validation failed", issues);
  }

  return {
    configPath,
    patch: normalizedPatch
  };
}

function extractUsedBotIndexes(currentConfig, incomingAgents) {
  const used = new Set();
  const allPaths = [];

  for (const agent of currentConfig.agents?.list ?? []) {
    if (typeof agent.workspace === "string") {
      allPaths.push(agent.workspace);
    }
  }

  for (const agent of incomingAgents) {
    if (typeof agent.workspace === "string") {
      allPaths.push(agent.workspace);
    }
  }

  for (const workspace of allPaths) {
    const match = path.basename(workspace).match(/^bot(\d+)$/i);
    if (match) {
      used.add(Number(match[1]));
    }
  }

  return used;
}

function nextBotWorkspace(baseDir, usedIndexes) {
  let index = 1;
  while (usedIndexes.has(index)) {
    index += 1;
  }
  usedIndexes.add(index);
  return path.join(baseDir, `bot${index}`);
}

function resolveAgentList(currentConfig, configPath, patchAgents) {
  if (!patchAgents?.list) {
    return {
      list: undefined,
      autoWorkspaces: []
    };
  }

  const existingDefaultWorkspace = currentConfig.agents?.defaults?.workspace;
  const baseDir =
    typeof existingDefaultWorkspace === "string" && existingDefaultWorkspace.length > 0
      ? path.dirname(existingDefaultWorkspace)
      : path.dirname(configPath);

  const usedIndexes = extractUsedBotIndexes(currentConfig, patchAgents.list);
  const autoWorkspaces = [];
  const resolvedAgents = patchAgents.list.map((agent) => {
    if (agent.workspace) {
      return clone(agent);
    }

    const existingAgent = currentConfig.agents?.list?.find((entry) => entry.id === agent.id);
    if (typeof existingAgent?.workspace === "string" && existingAgent.workspace.length > 0) {
      return {
        ...clone(agent),
        workspace: existingAgent.workspace
      };
    }

    const workspace = nextBotWorkspace(baseDir, usedIndexes);
    autoWorkspaces.push({
      agentId: agent.id,
      workspace,
      folder: path.basename(workspace)
    });
    return {
      ...clone(agent),
      workspace
    };
  });

  return {
    list: resolvedAgents,
    autoWorkspaces
  };
}

function mergeObjects(existingValue, patchValue) {
  if (Array.isArray(patchValue)) {
    return clone(patchValue);
  }

  if (!isObject(patchValue)) {
    return patchValue;
  }

  const merged = isObject(existingValue) ? clone(existingValue) : {};

  for (const [key, value] of Object.entries(patchValue)) {
    if (isObject(value) && isObject(merged[key])) {
      merged[key] = mergeObjects(merged[key], value);
      continue;
    }

    merged[key] = clone(value);
  }

  return merged;
}

function mergeAgentLists(currentList, incomingList) {
  const merged = currentList.map((entry) => clone(entry));
  const indexById = new Map(merged.map((entry, index) => [entry.id, index]));
  const incomingHasDefault = incomingList.some((entry) => entry.default === true);

  if (incomingHasDefault) {
    for (const entry of merged) {
      delete entry.default;
    }
  }

  for (const incoming of incomingList) {
    const currentIndex = indexById.get(incoming.id);
    if (currentIndex !== undefined) {
      merged[currentIndex] = {
        ...merged[currentIndex],
        ...clone(incoming)
      };
      continue;
    }

    indexById.set(incoming.id, merged.length);
    merged.push(clone(incoming));
  }

  if (merged.length > 0 && !merged.some((entry) => entry.default === true)) {
    merged[0] = {
      ...merged[0],
      default: true
    };
  }

  return merged;
}

function buildChannelSummary(currentConfig, patchChannels) {
  if (!patchChannels) {
    return [];
  }

  return Object.keys(patchChannels)
    .sort()
    .map((channelId) => ({
      channel: channelId,
      action: currentConfig.channels?.[channelId] ? "update" : "create"
    }));
}

function buildBindingSummary(bindings) {
  if (!Array.isArray(bindings)) {
    return [];
  }

  return bindings.map((binding, index) => ({
    index,
    match: isObject(binding.match) ? clone(binding.match) : undefined,
    agentId: typeof binding.agentId === "string" ? binding.agentId : undefined
  }));
}

export function buildPlan(rawRequest, currentConfig, configPathOverride) {
  const request = normalizeRequest(rawRequest, configPathOverride);
  const normalizedPatch = clone(request.patch);
  const { list: resolvedAgents, autoWorkspaces } = resolveAgentList(currentConfig, request.configPath, request.patch.agents);

  if (resolvedAgents) {
    normalizedPatch.agents = {
      list: resolvedAgents
    };
  }

  const mergedConfig = mergeManagedConfig(currentConfig, normalizedPatch);
  const warnings = autoWorkspaces.map((entry) => `Auto workspace for ${entry.agentId}: ${entry.folder}. You can rename it later.`);
  const discoveredChannels = Object.keys(currentConfig.channels ?? {}).sort();

  return {
    version: "1",
    configPath: request.configPath,
    patch: normalizedPatch,
    summary: {
      discoveredChannels,
      changedBlocks: Object.keys(normalizedPatch),
      channels: buildChannelSummary(currentConfig, normalizedPatch.channels),
      agents:
        normalizedPatch.agents?.list?.map((agent) => ({
          id: agent.id,
          workspace: agent.workspace,
          default: agent.default === true
        })) ?? [],
      bindings: buildBindingSummary(normalizedPatch.bindings),
      dmScope: normalizedPatch.session?.dmScope ?? currentConfig.session?.dmScope ?? null,
      autoWorkspaces
    },
    warnings,
    mergedConfig
  };
}

export function mergeManagedConfig(currentConfig, patch) {
  const merged = clone(currentConfig);

  if (patch.agents?.list) {
    merged.agents = {
      ...(isObject(merged.agents) ? merged.agents : {}),
      list: mergeAgentLists(merged.agents?.list ?? [], patch.agents.list)
    };
  }

  if (patch.channels) {
    merged.channels = {
      ...(isObject(merged.channels) ? merged.channels : {})
    };

    for (const [channelId, channelPatch] of Object.entries(patch.channels)) {
      merged.channels[channelId] = mergeObjects(merged.channels[channelId], channelPatch);
    }
  }

  if (patch.bindings) {
    merged.bindings = clone(patch.bindings);
  }

  if (patch.session?.dmScope) {
    merged.session = {
      ...(isObject(merged.session) ? merged.session : {}),
      dmScope: patch.session.dmScope
    };
  }

  return merged;
}

export async function applyPlan(plan, configPathOverride, backupPath) {
  if (!isObject(plan) || typeof plan.configPath !== "string" || !isObject(plan.patch)) {
    throw createCliError("INVALID_REQUEST", "Plan is missing configPath or patch", [issue("INVALID_REQUEST", "Plan is missing configPath or patch")]);
  }

  const configPath = configPathOverride && configPathOverride.length > 0 ? configPathOverride : plan.configPath;
  const currentConfig = await readJsonFile(configPath);
  const mergedConfig = mergeManagedConfig(currentConfig, plan.patch);
  const effectiveBackupPath = await createBackup(configPath, backupPath);
  await writeJsonFileAtomic(configPath, mergedConfig);

  return {
    backupPath: effectiveBackupPath,
    mergedConfig
  };
}

export function okResult(message, data, issues = []) {
  return {
    ok: true,
    code: "OK",
    message,
    ...(data !== undefined ? { data } : {}),
    ...(issues.length > 0 ? { issues } : {})
  };
}

export function errorResult(code, message, issues = []) {
  return {
    ok: false,
    code,
    message,
    ...(issues.length > 0 ? { issues } : {})
  };
}

export async function runCli(handler) {
  try {
    const envelope = await handler();
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
    process.exit(EXIT_CODES[envelope.code] ?? EXIT_CODES.OK);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : "INTERNAL_ERROR";
    const message = error instanceof Error ? error.message : String(error);
    const issues =
      error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)
        ? error.issues
        : [];
    process.stdout.write(`${JSON.stringify(errorResult(code, message, issues), null, 2)}\n`);
    process.exit(
      error && typeof error === "object" && "exitCode" in error && typeof error.exitCode === "number"
        ? error.exitCode
        : EXIT_CODES[code] ?? EXIT_CODES.INTERNAL_ERROR
    );
  }
}
