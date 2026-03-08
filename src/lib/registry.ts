import path from "node:path";
import type { ChannelConfig, ChannelRegistry, ChannelRegistryEntry, OpenClawConfig } from "./types.js";
import { getScriptsDir } from "./paths.js";
import { readJsonFile } from "./files.js";

export interface ResolvedChannelDefinition extends ChannelRegistryEntry {
  channel: string;
  compatibilityMode: boolean;
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
    compatibilityMode: true
  };
}

export function resolveChannelDefinition(
  channel: string,
  registry: ChannelRegistry,
  currentConfig: OpenClawConfig
): ResolvedChannelDefinition | undefined {
  const registered = registry[channel];
  if (registered) {
    return {
      channel,
      ...registered,
      compatibilityMode: false
    };
  }

  return inferCompatibilityDefinition(channel, currentConfig.channels?.[channel]);
}
