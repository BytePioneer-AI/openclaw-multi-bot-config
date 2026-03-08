# Routing Rules

## Core model

The skill manages this mapping:

`channel account -> agent -> workspace`

The common OpenClaw config blocks are:

- `channels.<channel>.accounts`
- `channels.<channel>.defaultAccount`
- `agents.list`
- `bindings`
- `session.dmScope`

## Strategy by mode

| Mode | Behavior | Required config blocks |
| --- | --- | --- |
| `shared-agent` | Multiple accounts share one agent | `accounts`, `defaultAccount`, usually `dmScope` |
| `isolated-agents` | One account maps to one agent | `accounts`, `agents.list`, `bindings`, `dmScope` |
| `hybrid` | Some accounts share, some isolate | `accounts`, selective `agents.list`, selective `bindings`, `dmScope` |

## `dmScope`

| Situation | Recommended value |
| --- | --- |
| Single channel, single account | Preserve current value |
| Single channel, multiple accounts | `per-account-channel-peer` |
| Multiple channels or multiple isolated agents | `per-account-channel-peer` |

## `defaultAccount`

- Preserve the existing value when possible.
- If the channel has no default account yet, use the first managed account.
- When the user specifies a default account, it must exist after merge.

## `bindings`

- Only create account-level bindings when accounts must route to different agents.
- Use `match.channel + match.accountId` as the stable routing key.
- Shared-agent mode should not create account-level bindings by default.

## `workspace`

- Reuse an existing agent workspace unless the user asks for a custom path.
- For auto-generated workspaces, prefer `<config-dir>/workspace-<agentId>`.
- Treat reusing one workspace across different agent ids as a conflict unless explicitly allowed.
