# Config Strategies

When the user has not picked a routing model yet, present the available options briefly and recommend `isolated-agents` by default.

Recommended order:

1. `isolated-agents`
2. `shared-agent`
3. `hybrid`

## Strategy A: Shared agent

Use this when the user says:

- multiple bots should share one memory or persona
- only direct-message isolation matters
- workspaces do not need to be separated

Typical result:

- one shared agent or the existing default agent
- raw channel config under `channels.<channel>`
- no separate `bindings`
- `dmScope` set to `per-account-channel-peer` when DMs should stay isolated

## Strategy B: Isolated agents

This is the default recommendation for most multi-bot requests.

Use this when the user says:

- each bot should have its own memory or workspace
- traffic must route to different agents
- one bot is for one role and another bot is for another role
- the user did not explicitly ask to share one memory across all bots

Typical result:

- one or more `agents.list` entries
- one or more `bindings`
- `dmScope` set to `per-account-channel-peer`

Why this is the default:

- routing is explicit
- bot behavior is easier to reason about
- workspace and memory isolation are safer
- later expansion is simpler than splitting one shared agent apart

## Strategy C: Hybrid

Use this when the user mixes both patterns.

Example:

- `main` and `marketing` share one agent
- `support` gets its own agent

Typical result:

- some traffic goes to a shared agent
- some traffic uses dedicated `bindings`
- only the managed parts of config are changed
