# Channel Fields

## Registered channels

The skill ships with a machine-readable registry in `scripts/channel_registry.json`.

Current built-in channels:

| Channel | Required fields | Optional fields |
| --- | --- | --- |
| `dingtalk` | `clientId`, `clientSecret` | `enabled`, `enableAICard` |
| `qqbot` | `appId`, `clientSecret` | `enabled`, `sandbox` |
| `wecom` | `webhookPath`, `token`, `encodingAESKey` | `enabled`, `receiveId` |
| `wecom-app` | `webhookPath`, `token`, `encodingAESKey`, `corpId`, `corpSecret`, `agentId` | `enabled`, `receiveId` |
| `feishu-china` | `appId`, `appSecret` | `enabled`, `verificationToken` |

This table is a starter registry, not an exhaustive list of all OpenClaw channels or adapters.
If the user is working with another channel or a custom adapter, the skill can still proceed when the user confirms the exact credential field names.

## Field confirmation rule

Do not assume that the user's labels match the canonical config keys.

When the user says things like:

- `Bot ID`
- `Secret`
- `AppKey`
- `Webhook`
- `Corp ID`

the skill should restate the target channel's canonical field names and confirm the mapping before generating `request.json`.

Example:

- user says `Bot ID + Secret` for `wecom-app`
- do not guess whether `Bot ID` means `agentId`, app id from another adapter, or a user-facing label
- ask the user which canonical fields these values map to in their adapter or existing config

For registered channels:

- prefer the registry field names in the final request
- if the user's terms are ambiguous, ask a short confirmation question

For existing configured channels:

- compare the user's labels with the existing account object keys in `openclaw.json`
- if there is a clear match, propose the mapping and ask for confirmation before apply

For new unregistered channels:

- require the user to name the exact fields explicitly
- store those names in `request.json` as `targets[*].credentialFields`
- do not infer a brand new field set from loose labels alone

## Compatibility mode

If a channel is not registered but already exists in `openclaw.json`, the planner can infer account fields from the existing account objects.

Compatibility mode is intended for:

- extending an already-configured channel
- preserving unknown fields during merge

Compatibility mode is not intended for:

- creating a brand new unregistered channel with unknown credential fields

For a brand new unregistered channel, the user must provide the field set explicitly before the planner can proceed.
