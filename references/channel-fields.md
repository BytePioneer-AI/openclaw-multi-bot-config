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

## Compatibility mode

If a channel is not registered but already exists in `openclaw.json`, the planner can infer account fields from the existing account objects.

Compatibility mode is intended for:

- extending an already-configured channel
- preserving unknown fields during merge

Compatibility mode is not intended for:

- creating a brand new unregistered channel with unknown credential fields

For a brand new unregistered channel, the user must provide the field set explicitly before the planner can proceed.
