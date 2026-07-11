# Clashub Admin API

Use the base path `/api/v1/admin`. Send every request with:

```http
Authorization: Bearer <token>
Accept: application/json
```

Send JSON writes with `Content-Type: application/json`. Never use the legacy query
token for admin endpoints. Responses use `Cache-Control: no-store`.

## Resources

The API exposes three resource names and payload fields:

| Resource | Mutable field |
| --- | --- |
| `configs` | `content` |
| `proxy-providers` | `subscriptionUrl` |
| `fetchers` | `url` |

Every stored record contains `id`, `revision`, `createdAt`, and `updatedAt` in
addition to its mutable field.

## Snapshot

`GET /api/v1/admin/snapshot` returns:

```json
{
  "value": {
    "configs": [],
    "proxyProviders": [],
    "fetchers": []
  }
}
```

## Collections

`GET /api/v1/admin/<resource>` returns `{ "values": [...] }`.

`POST /api/v1/admin/<resource>` creates a record and returns status `201` with
`{ "value": {...} }`.

Config body:

```json
{ "id": "main", "content": "mixed-port: 7890" }
```

Proxy provider body:

```json
{ "id": "main", "subscriptionUrl": "https://example.com/subscription" }
```

Fetcher body:

```json
{ "id": "rules", "url": "https://example.com/rules.yaml" }
```

## Individual records

`GET /api/v1/admin/<resource>/<id>` returns `{ "value": {...} }` or `404`.

`PUT /api/v1/admin/<resource>/<id>` updates the mutable field. Include the current
revision:

```json
{ "content": "mixed-port: 7891", "expectedRevision": 3 }
```

Use `subscriptionUrl` or `url` instead of `content` for the other resource types.

`DELETE /api/v1/admin/<resource>/<id>` requires:

```json
{ "expectedRevision": 3 }
```

It returns `{ "deleted": true }`.

## Errors

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, ID, URL, field, or revision |
| `401` | Missing or invalid Bearer token |
| `404` | Unknown resource type, ID, or record |
| `405` | Unsupported method; inspect the `Allow` header |
| `409` | Existing ID or revision conflict |

A revision conflict includes the current record in `value`. Read it before deciding
whether to apply the user's change again.
