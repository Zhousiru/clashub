---
name: clashub-manage
description: Manage a Clashub instance through its authenticated admin API. Use when Codex receives a Clashub base URL and token and needs to inspect, list, create, update, delete, export, or back up Clashub configs, proxy providers, or fetchers, including handling revision conflicts safely.
---

# Manage Clashub

Use the bundled client for deterministic access to Clashub. Do not reconstruct HTTP
requests unless the client cannot cover the operation.

## Connect

1. Obtain the Clashub base URL and token from the user if either is missing.
2. Pass the URL with `--base-url` or `CLASHUB_URL`.
3. Supply the token through `CLASHUB_TOKEN` or the client's hidden interactive prompt.
4. Never place the token in a URL, command-line argument, committed file, or displayed output.
5. Use HTTPS for non-local instances.

Set `CLASHUB_TOKEN` before using `--file -`; the token prompt and config content
cannot safely share standard input.

Run the client with Python 3:

```text
python <skill-dir>/scripts/clashub_client.py --base-url https://clashub.example.com snapshot
```

Read [references/api.md](references/api.md) when troubleshooting API responses or
when an operation needs exact request and response fields.

## Inspect data

Use these commands without additional confirmation:

```text
snapshot [--output backup.json]
list configs|proxy-providers|fetchers
get configs|proxy-providers|fetchers <id>
```

Treat subscription URLs, fetcher URLs, and config bodies as potentially sensitive.
Summarize them instead of reproducing them unless the user requests the exact values.

## Create or update data

Use `--file <path>` for config content and `--file -` to read config content from
standard input. Use `--url` for proxy providers and fetchers.

```text
create configs <id> [--file <path|->]
create proxy-providers <id> --url <subscription-url>
create fetchers <id> --url <fetcher-url>

update configs <id> --file <path|-> [--revision <n>]
update proxy-providers <id> --url <subscription-url> [--revision <n>]
update fetchers <id> --url <fetcher-url> [--revision <n>]
```

Omit `--revision` to have the client read the current record first. If the server
returns `409 Conflict`, report the current record and ask whether to reapply the
change. Do not retry or overwrite automatically.

## Delete data

Require explicit user confirmation immediately before deleting. Then run:

```text
delete configs|proxy-providers|fetchers <id> --yes [--revision <n>]
```

Do not infer deletion permission from a broader cleanup request when the exact IDs
are ambiguous. Export a snapshot before deleting multiple records.

## Apply bulk changes

1. Export a snapshot before the first write.
2. Inspect the affected records and revisions.
3. Apply creates and updates one record at a time.
4. Stop on the first validation, authentication, or revision error.
5. Report completed and uncompleted operations separately.

Do not modify or rotate the Clashub authentication token; this skill manages data
resources only.
