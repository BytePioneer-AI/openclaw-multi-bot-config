---
name: openclaw-bot-config
description: Configure or modify OpenClaw multi-account, multi-bot, and multi-agent routing without manually editing openclaw.json.
---

# OpenClaw Bot Config

Use this skill when the user wants to:

- configure multiple bots or accounts for OpenClaw
- add or update a channel account in `openclaw.json`
- route different accounts to one or more agents
- change `defaultAccount`, `bindings`, or `session.dmScope`
- avoid hand-editing the OpenClaw config file

## Workflow

1. Read the target `openclaw.json` first.
2. Identify existing `channels.*` entries and confirm whether the user wants to modify an existing channel or add a new one.
3. Collect a structured request that matches `scripts/schema.request.json`.
4. If routing or channel rules are unclear, read:
   - `references/routing-rules.md`
   - `references/channel-fields.md`
   - `references/config-strategies.md`
   - `references/examples.md`
5. Generate a preview with:

```bash
node ./scripts/plan_config.mjs --request <request.json> --config <openclaw.json> --out <plan.json>
node ./scripts/validate_plan.mjs --plan <plan.json> --config <openclaw.json>
```

6. Summarize the preview for the user. Always show:
   - channels to add or modify
   - accounts to add or update
   - agents to add or update
   - bindings to add or replace
   - final `dmScope`
   - warnings or conflicts
7. Only write config after explicit confirmation:

```bash
node ./scripts/apply_config.mjs --plan <plan.json> --config <openclaw.json>
```

8. If the user asks to restore the previous config, use:

```bash
node ./scripts/rollback_config.mjs --config <openclaw.json> --backup <backup.json.bak>
```

## Guardrails

- Never hand-edit `openclaw.json` when these scripts can do the work.
- Never let the model write the final config directly.
- Treat `scripts/schema.request.json` as the contract for user intent.
- Treat `scripts/schema.plan.json` as the contract for execution.
- Keep secrets masked in previews, logs, and user-facing summaries.
