import path from "node:path";
import { getScriptsDir } from "./paths.js";
import { readJsonFile } from "./files.js";
export async function loadChannelRegistry() {
    return readJsonFile(path.join(getScriptsDir(), "channel_registry.json"), "INVALID_REQUEST");
}
export function inferCompatibilityDefinition(channel, channelConfig) {
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
export function resolveChannelDefinition(channel, registry, currentConfig) {
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
//# sourceMappingURL=registry.js.map