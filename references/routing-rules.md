# Routing Rules

## Core model

The skill manages this mapping:

`channel -> binding -> agent -> workspace`

The managed OpenClaw config blocks are:

- `channels.<channel>`
- `agents.list`
- `bindings`
- `session.dmScope`

## Strategy by mode

| Mode | Behavior | Required config blocks |
| --- | --- | --- |
| `shared-agent` | Multiple bots share one agent | `channels`, usually `session.dmScope` |
| `isolated-agents` | Different traffic goes to different agents | `channels`, `agents.list`, `bindings`, `session.dmScope` |
| `hybrid` | Some traffic shares and some isolates | `channels`, selective `agents.list`, selective `bindings`, `session.dmScope` |

Default recommendation:

- prefer `isolated-agents` when the user has multiple bots and has not chosen a model yet
- only prefer `shared-agent` when the user explicitly wants all bots to share one persona or workspace

## `dmScope`

| Situation | Recommended value |
| --- | --- |
| One bot, no DM isolation request | Preserve current value |
| Multiple bots and DMs should not mix | `per-account-channel-peer` |
| Multiple isolated agents | `per-account-channel-peer` |

Default recommendation:

- if the user is trying to keep bot DM history separate, recommend `per-account-channel-peer`

## `bindings`

- Only create `bindings` when traffic must route to different agents.
- Use the real OpenClaw binding shape already present in the local config when possible.
- Shared-agent mode should not create extra `bindings` by default.

## `workspace`

- Reuse an existing agent workspace unless the user asks for a custom path.
- For auto-generated workspaces, prefer sibling folders named `bot1`, `bot2`, `bot3`, ... under the same parent directory as `agents.defaults.workspace` when available.
- Tell the user these auto names can be changed later.
