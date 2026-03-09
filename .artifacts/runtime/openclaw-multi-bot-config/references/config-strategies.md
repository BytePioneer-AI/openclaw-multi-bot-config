# Config Strategies

## Strategy A: Shared agent

Use this when the user says:

- multiple bots should share one memory or persona
- only direct-message isolation matters
- workspaces do not need to be separated

Typical result:

- one channel with multiple accounts
- one shared agent or the existing default agent
- no account-level bindings
- `dmScope` set to `per-account-channel-peer` if multiple accounts are involved

## Strategy B: Isolated agents

Use this when the user says:

- each bot should have its own memory or workspace
- accounts must route to different agents
- one bot is for one role and another bot is for another role

Typical result:

- multiple accounts
- one agent per account
- one binding per account
- `dmScope` set to `per-account-channel-peer`

## Strategy C: Hybrid

Use this when the user mixes both patterns.

Example:

- `main` and `marketing` share one agent
- `support` gets its own agent

Typical result:

- some accounts have account-level bindings
- some accounts rely on shared-agent routing
- only the managed parts of config are changed
