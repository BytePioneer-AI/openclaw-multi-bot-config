# Examples

## Example 1: Shared agent

User intent:

`我有两个钉钉机器人，想共用一个 Agent，但私聊历史不要串。`

Expected shape:

- one shared agent
- raw `channels.dingtalk` patch with the real channel fields
- no separate `bindings`
- recommended `session.dmScope`: `per-account-channel-peer`

## Example 2: Isolated agents

User intent:

`给钉钉两个机器人各配一个独立 agent。`

Expected shape:

- `agents.list` contains two entries
- omit `workspace` if you want the script to auto-generate `bot1`, `bot2`
- `bindings` contains the final desired routing list
- recommended `session.dmScope`: `per-account-channel-peer`

## Example 3: Modify existing channel

User intent:

`保留当前配置，只更新现有企业微信渠道的凭证。`

Expected shape:

- read the current `channels.wecom-app`
- confirm the real field names before patching
- only include the fields that should change in `patch.channels.wecom-app`

## Example 4: New channel

User intent:

`在当前配置上新增 qqbot 渠道，并让它共用现有 default agent。`

Expected shape:

- new raw channel node under `patch.channels.qqbot`
- no new `agents.list` entry if the current shared agent is enough
- no new `bindings` if routing does not change
