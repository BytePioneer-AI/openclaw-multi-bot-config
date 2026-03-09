# Channel Fields

## Field source

This skill does not rely on a prebuilt channel registry.

Field names come from one of these sources:

- the user's explicit confirmation
- an existing channel object already present in `openclaw.json`
- the exact patch node the skill is about to write under `patch.channels.<channel>`

## Field confirmation rule

Do not assume that the user's labels match the canonical config keys.

When the user says things like:

- `Bot ID`
- `Secret`
- `AppKey`
- `Webhook`
- `Corp ID`

the skill should restate the target field names and confirm the mapping before generating `request.json`.

Example:

- user says `Bot ID + Secret` for a channel
- do not guess whether `Bot ID` means `agentId`, app id from another adapter, or a user-facing label
- ask the user which canonical fields these values map to in their adapter or existing config

For existing configured channels:

- compare the user's labels with the existing channel object keys in `openclaw.json`
- if there is a clear match, propose the mapping and ask for confirmation before apply

For new channels:

- require the user to name the exact fields explicitly
- write those exact field names directly into `patch.channels.<channel>`
- do not infer a brand new field set from loose labels alone

## Merge rule

The patch format mirrors the real OpenClaw config.

That means:

- `request.json` may contain an internal `patch`
- the final `openclaw.json` does not contain `targets`, `operation`, or similar skill-only fields
- channel values should already look like real OpenClaw channel nodes before they are passed to the script
