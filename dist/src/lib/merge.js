function clone(value) {
    return structuredClone(value);
}
function mergeAgents(existingAgents, plannedAgents) {
    const merged = existingAgents.map((agent) => clone(agent));
    const indexById = new Map(merged.map((agent, index) => [agent.id, index]));
    const hasManagedDefault = plannedAgents.some((agent) => agent.default);
    if (hasManagedDefault) {
        merged.forEach((agent) => {
            delete agent.default;
        });
    }
    for (const plannedAgent of plannedAgents) {
        const existingIndex = indexById.get(plannedAgent.id);
        if (existingIndex !== undefined) {
            merged[existingIndex] = {
                ...merged[existingIndex],
                ...clone(plannedAgent)
            };
            continue;
        }
        indexById.set(plannedAgent.id, merged.length);
        merged.push(clone(plannedAgent));
    }
    return merged;
}
function mergeBindings(existingBindings, plannedBindings) {
    const managedKeys = new Map(plannedBindings.map((binding) => [`${binding.match.channel}::${binding.match.accountId}`, clone(binding)]));
    const merged = existingBindings.map((binding) => {
        const key = `${binding.match?.channel}::${binding.match?.accountId}`;
        return managedKeys.get(key) ?? clone(binding);
    });
    const existingKeys = new Set(existingBindings.map((binding) => `${binding.match?.channel}::${binding.match?.accountId}`));
    const newBindings = [...managedKeys.entries()]
        .filter(([key]) => !existingKeys.has(key))
        .map(([, binding]) => binding)
        .sort((left, right) => {
        const leftKey = `${left.match.channel}:${left.match.accountId}:${left.agentId}`;
        const rightKey = `${right.match.channel}:${right.match.accountId}:${right.agentId}`;
        return leftKey.localeCompare(rightKey);
    });
    return [...merged, ...newBindings];
}
export function mergeConfig(currentConfig, plan) {
    const merged = clone(currentConfig);
    if (plan.patch.agents?.list) {
        merged.agents = {
            ...(merged.agents ?? {}),
            list: mergeAgents(merged.agents?.list ?? [], plan.patch.agents.list)
        };
    }
    if (plan.patch.channels) {
        merged.channels = {
            ...(merged.channels ?? {})
        };
        for (const [channel, patchChannel] of Object.entries(plan.patch.channels)) {
            const existingChannel = merged.channels[channel] ?? {};
            const existingAccounts = existingChannel.accounts ?? {};
            const patchAccounts = patchChannel.accounts ?? {};
            merged.channels[channel] = {
                ...existingChannel,
                ...clone(patchChannel),
                accounts: {
                    ...existingAccounts,
                    ...Object.fromEntries(Object.entries(patchAccounts).map(([accountId, accountConfig]) => [
                        accountId,
                        {
                            ...(existingAccounts[accountId] ?? {}),
                            ...clone(accountConfig)
                        }
                    ]))
                }
            };
        }
    }
    if (plan.patch.bindings) {
        merged.bindings = mergeBindings(merged.bindings ?? [], plan.patch.bindings);
    }
    if (plan.patch.session) {
        merged.session = {
            ...(merged.session ?? {}),
            ...clone(plan.patch.session)
        };
    }
    return merged;
}
//# sourceMappingURL=merge.js.map