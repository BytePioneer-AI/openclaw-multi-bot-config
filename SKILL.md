---
name: openclaw-multi-bot-config
description: Explain and minimally configure OpenClaw multi-bot and multi-agent routing. Use this skill when the user asks how to wire multiple bots or agents in `openclaw.json`, how `dmScope` differs from `bindings`, which routing option to choose, or wants a safe preview/apply flow that only touches `agents`, `channels`, `bindings`, and `session.dmScope`.
---

# OpenClaw Bot Config

This skill only does two things:

- answer OpenClaw multi-bot configuration questions by reading bundled reference documents
- safely modify the local `openclaw.json` by changing only `agents`, `channels`, `bindings`, and `session.dmScope`

This skill does not design personas, prompts, providers, or unrelated OpenClaw settings.

Classify the request before acting:

- Use consult mode when the user is asking for requirements, differences, tradeoffs, examples, or how multi-bot OpenClaw config works.
- Use execution mode when the user wants to inspect current config, generate a preview, or actually change `openclaw.json`.

## Consult Mode

1. Read `references/multi-account-guide.md` first.
2. Read other references only as needed:
   - `references/channel-fields.md`
   - `references/config-strategies.md`
   - `references/routing-rules.md`
   - `references/examples.md`
3. Answer in product terms first:
   - what problem each config block solves
   - present 2-3 topology options when the user has not chosen one yet
   - default to recommending `isolated-agents` unless the user explicitly says multiple bots should share one memory or workspace
   - explain whether the user needs shared-agent, isolated-agents, or hybrid
   - what information is still missing
   - which user-provided labels still need to be mapped to canonical config field names
4. When presenting options, prefer this order:
   - `isolated-agents` as the default recommendation
   - `shared-agent` as the lighter-weight option when the user explicitly wants one shared persona
   - `hybrid` only when the user clearly mixes both needs
5. Recommend `session.dmScope = per-account-channel-peer` whenever the user is trying to isolate direct messages by bot or account, unless they have a strong reason to preserve a different value.
6. Do not run planning or apply scripts if the user is still deciding or only asking how it works.
7. If the user asks about their existing config, read `openclaw.json` and explain the current topology before suggesting changes.

## Execution Mode

1. Read the target `openclaw.json` first.
2. Identify existing `channels.*` entries and determine whether the user wants to modify an existing channel or add a new one.
3. Build a minimal `request.json` that matches `scripts/schema.request.json`.
4. The request format is internal to this skill. It is not the OpenClaw config format.
5. Use this shape:

```json
{
  "configPath": "C:\\Users\\you\\.openclaw\\openclaw.json",
  "patch": {
    "agents": {
      "list": [
        {
          "id": "ding-main"
        }
      ]
    },
    "channels": {
      "dingtalk": {
        "enabled": true,
        "clientId": "real-client-id",
        "clientSecret": "real-client-secret"
      }
    },
    "bindings": [],
    "session": {
      "dmScope": "per-account-channel-peer"
    }
  }
}
```

6. `patch` mirrors the real OpenClaw blocks. Do not invent `targets`, `operation`, or other final config fields.
7. Confirm credential field names before building the patch:
   - if the user gives labels like `Bot ID`, `Secret`, `AppKey`, or `Webhook`, map them to the channel's real config fields
   - if the target channel already exists in `openclaw.json`, compare with the existing channel object keys and confirm the mapping when there is ambiguity
   - if the channel is new or the mapping is unclear, do not guess; ask the user which exact config field each provided value should populate
8. If you create `agents.list` entries without a `workspace`, the script will auto-generate workspace folders like `bot1`, `bot2`, `bot3` under the same parent directory as `agents.defaults.workspace` when available, otherwise under the config directory. Tell the user these names can be changed later.
9. Generate and validate a preview with:

```bash
node ./scripts/plan_config.mjs --request <request.json> --config <openclaw.json> --out <plan.json>
```

10. Summarize the preview for the user. Always show:
   - channels to add or modify
   - agents to add or update
   - bindings to replace
   - final `dmScope`
   - auto-generated workspace folder names such as `bot1`, `bot2`, `bot3`, and state that the user can change them later
   - warnings
11. Only write config after explicit confirmation:

```bash
node ./scripts/apply_config.mjs --plan <plan.json> --config <openclaw.json>
```

## Guardrails

- Treat explanation and execution as separate modes. Do not jump to file changes when the user is still asking design or requirements questions.
- Only operate on the local `openclaw.json` file. Do not try to configure providers, auth, gateway, plugins, prompts, or personas.
- When the user provides credential labels that do not exactly match the existing config, confirm the field mapping before generating `request.json`.
- Never hand-edit `openclaw.json` when these scripts can do the work.
- Never let the model write the final config directly.
- Treat `scripts/schema.request.json` as the contract for the internal request format, not as the OpenClaw config schema.
- Keep secrets masked in previews, logs, and user-facing summaries.
