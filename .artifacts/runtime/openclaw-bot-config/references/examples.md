# Examples

## Example 1: Shared agent

User intent:

`我有两个钉钉机器人，想共用一个 Agent，但私聊历史不要串。`

Expected shape:

- channel: `dingtalk`
- mode: `shared-agent`
- accounts: `main`, `work`
- no account-level bindings
- recommended `dmScope`: `per-account-channel-peer`

## Example 2: Isolated agents

User intent:

`给钉钉 main 和 work 两个账号各配一个独立 agent。`

Expected shape:

- channel: `dingtalk`
- mode: `isolated-agents`
- accounts: `main`, `work`
- agents: `ding-main`, `ding-work`
- bindings for each account
- recommended `dmScope`: `per-account-channel-peer`

## Example 3: Modify existing channel

User intent:

`保留当前配置，再给现有企业微信渠道新增一个账号。`

Expected shape:

- operation: `modify-existing-channel`
- reuse the current channel node
- preserve unrelated channel fields
- only add or update managed accounts

## Example 4: New channel

User intent:

`在当前配置上新增 qqbot 渠道，并让它共用现有 default agent。`

Expected shape:

- operation: `add-channel`
- new channel node under `channels.qqbot`
- one or more accounts
- no new binding if the default agent is shared
