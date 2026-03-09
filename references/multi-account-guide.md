# OpenClaw Multi-Bot Guide

Use this file when the user asks how OpenClaw multi-bot config works, what to configure, or which routing model to choose before changing files.

Scope:

- answer questions about multi-bot config
- help the user choose a routing scheme
- confirm field names before configuration
- modify only `agents`, `channels`, `bindings`, and `session.dmScope`

Out of scope:

- persona design
- prompt design
- provider or model setup
- gateway, plugin, or auth configuration outside the four managed config areas

## Core concepts

- `channels.<channel>` stores the real adapter config that OpenClaw reads
- `agents.list` defines how many truly separate agents exist
- `bindings` routes traffic to a specific `agentId`
- `session.dmScope` isolates direct-message history; it does not choose the target agent
- `request.json` is an internal skill input that contains `configPath` and `patch`; it is not part of `openclaw.json`

## What users usually mean

- "多个机器人共用一个人格，但聊天别串"
  Usually means `shared-agent` plus `session.dmScope = per-account-channel-peer`
- "每个机器人都要独立记忆和工作区"
  Usually means `isolated-agents` plus `agents.list` and `bindings`
- "有的机器人共用一个 agent，有的单独分开"
  Usually means `hybrid`

## What to present first

If the user has not chosen a topology yet, present these options first:

1. `isolated-agents`
   Default recommendation for multi-bot setups
2. `shared-agent`
   Use only when the user explicitly wants one shared memory or persona
3. `hybrid`
   Use when some bots should share and others should split

Default `dmScope` recommendation when DMs should not mix:

- `per-account-channel-peer`

Default workspace naming when creating multiple agents:

- use folder names `bot1`, `bot2`, `bot3`, ...
- tell the user these are default names and can be changed later

## Shared agent vs isolated agents

### Shared agent

Use when:

- multiple bots should share one memory or persona
- the user mainly wants DM isolation
- separate workspaces are not required

Typical result:

- one shared `agentId`
- raw channel config under `channels.<channel>`
- `session.dmScope = per-account-channel-peer`
- no separate `bindings` by default

### Isolated agents

Use when:

- different bots should have different memory, workspace, or auth state
- different routes must go to different agents
- the user describes separate roles such as support, ops, or admin bots

Typical result:

- raw channel config under `channels.<channel>`
- `agents.list`
- one or more `bindings`
- `session.dmScope = per-account-channel-peer`

## `dmScope` vs `bindings`

- `dmScope` solves "will DM history mix together?"
- `bindings` solves "which agent receives this traffic?"
- DM isolation alone does not create separate agents
- Separate agents usually require both `agents.list` and `bindings`

## Information to collect before execution

- target channel or channels
- whether the user is modifying an existing channel or adding a new one
- credentials required by that channel
- mapping from user-facing labels to canonical config field names when the user says `Bot ID`, `Secret`, or similar
- whether bots share one agent or map to different agents
- whether workspaces should be auto-generated or custom

This skill does not hardcode a channel registry.
When the user is using another adapter, the important thing is to confirm the exact field names that should appear under `channels.<channel>`.

## Common recommendations

- when the user has not chosen a routing model, recommend one bot per agent first
- if the user is unsure, ask business questions first instead of asking for low-level JSON fields
- if the user has already pasted credential values, confirm the exact field names instead of asking them to re-explain the whole topology
- show current discovered channels before proposing a change when an existing config is available
