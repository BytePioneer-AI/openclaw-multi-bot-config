import path from "node:path";
import type { ChannelConfig, ChannelRegistry, ChannelRegistryEntry, OpenClawConfig, RequestCredentialFields } from "./types.js";
import { getScriptsDir } from "./paths.js";
import { readJsonFile } from "./files.js";

export interface ResolvedChannelDefinition extends ChannelRegistryEntry {
  channel: string;
  compatibilityMode: boolean;
  source: "registry" | "request" | "compatibility";
}

export async function loadChannelRegistry(): Promise<ChannelRegistry> {
  return readJsonFile<ChannelRegistry>(path.join(getScriptsDir(), "channel_registry.json"), "INVALID_REQUEST");
}

export function inferCompatibilityDefinition(channel: string, channelConfig: ChannelConfig | undefined): ResolvedChannelDefinition | undefined {
  const accounts = channelConfig?.accounts;
  const firstAccount = accounts ? Object.values(accounts)[0] : undefined;
  if (!firstAccount) {
    return undefined;
  }

  const inferredFields = Object.keys(firstAccount);
  return {
    channel,
    requiredFields: inferredFields,
    optionalFields: [],
    supportsAccounts: true,
    defaults: {},
    compatibilityMode: true,
    source: "compatibility"
  };
}

export function createRequestDefinition(channel: string, fieldSet: RequestCredentialFields): ResolvedChannelDefinition {
  return {
    channel,
    requiredFields: [...fieldSet.requiredFields],
    optionalFields: [...(fieldSet.optionalFields ?? [])],
    supportsAccounts: true,
    defaults: {},
    compatibilityMode: false,
    source: "request"
  };
}

export function resolveChannelDefinition(
  channel: string,
  registry: ChannelRegistry,
  currentConfig: OpenClawConfig,
  fieldSet?: RequestCredentialFields
): ResolvedChannelDefinition | undefined {
  if (fieldSet) {
    return createRequestDefinition(channel, fieldSet);
  }

  const registered = registry[channel];
  if (registered) {
    return {
      channel,
      ...registered,
      compatibilityMode: false,
      source: "registry"
    };
  }

  return inferCompatibilityDefinition(channel, currentConfig.channels?.[channel]);
}
