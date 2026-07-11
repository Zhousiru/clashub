#!/usr/bin/env python3
"""Deterministic CLI client for the Clashub admin API."""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen


RESOURCES = ("configs", "proxy-providers", "fetchers")


class ClientError(Exception):
    """A safe-to-display client or API error."""

    def __init__(self, message: str, status: int | None = None, data: Any = None):
        super().__init__(message)
        self.status = status
        self.data = data


class ClashubClient:
    def __init__(self, base_url: str, token: str, timeout: float):
        parsed = urlsplit(base_url)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.query
            or parsed.fragment
        ):
            raise ClientError("Base URL must be an absolute HTTP or HTTPS URL")
        if not token:
            raise ClientError("A non-empty Clashub token is required")
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def request(
        self, method: str, path: str, payload: dict[str, Any] | None = None
    ) -> Any:
        body = None
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.token}",
            "User-Agent": "clashub-manage-skill/1.0",
        }
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(
            f"{self.base_url}{path}", data=body, headers=headers, method=method
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                return _decode_json(response.read())
        except HTTPError as error:
            data = _decode_json(error.read(), allow_text=True)
            message = _error_message(data) or f"Clashub returned HTTP {error.code}"
            raise ClientError(message, error.code, data) from None
        except URLError as error:
            raise ClientError(f"Could not reach Clashub: {error.reason}") from None


def _decode_json(data: bytes, allow_text: bool = False) -> Any:
    if not data:
        return None
    text = data.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if allow_text:
            return {"error": text[:500]}
        raise ClientError("Clashub returned a non-JSON response") from None


def _error_message(data: Any) -> str | None:
    if isinstance(data, dict) and isinstance(data.get("error"), str):
        return data["error"]
    return None


def _resource_path(resource: str, resource_id: str | None = None) -> str:
    path = f"/api/v1/admin/{resource}"
    if resource_id is not None:
        path += f"/{quote(resource_id, safe='')}"
    return path


def _read_config(path: str | None, required: bool) -> str:
    if path is None:
        if required:
            raise ClientError("Config updates require --file <path|->")
        return ""
    if path == "-":
        return sys.stdin.read()
    try:
        return Path(path).read_text(encoding="utf-8")
    except OSError as error:
        raise ClientError(f"Could not read config file: {error}") from None


def _mutation_payload(args: argparse.Namespace, creating: bool) -> dict[str, Any]:
    if args.resource == "configs":
        return {"content": _read_config(args.file, required=not creating)}
    if not args.url:
        raise ClientError(f"{args.resource} operations require --url")
    field = "subscriptionUrl" if args.resource == "proxy-providers" else "url"
    return {field: args.url}


def _current_revision(
    client: ClashubClient, resource: str, resource_id: str
) -> int:
    response = client.request("GET", _resource_path(resource, resource_id))
    try:
        revision = response["value"]["revision"]
    except (KeyError, TypeError):
        raise ClientError("Clashub response did not contain a revision") from None
    if not isinstance(revision, int):
        raise ClientError("Clashub returned an invalid revision")
    return revision


def _write_output(data: Any, output: str | None = None) -> None:
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if output:
        try:
            Path(output).write_text(text, encoding="utf-8")
        except OSError as error:
            raise ClientError(f"Could not write output file: {error}") from None
        print(json.dumps({"written": output}, ensure_ascii=False))
        return
    sys.stdout.write(text)


def _add_value_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("resource", choices=RESOURCES)
    parser.add_argument("id")
    parser.add_argument("--file", help="Config UTF-8 file, or - for standard input")
    parser.add_argument("--url", help="Proxy provider subscription URL or fetcher URL")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("CLASHUB_URL"),
        help="Clashub base URL (default: CLASHUB_URL)",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    commands = parser.add_subparsers(dest="command", required=True)

    snapshot = commands.add_parser("snapshot", help="Export all managed data")
    snapshot.add_argument("--output", help="Write JSON to a UTF-8 file")

    listing = commands.add_parser("list", help="List a resource collection")
    listing.add_argument("resource", choices=RESOURCES)

    get_one = commands.add_parser("get", help="Get one resource")
    get_one.add_argument("resource", choices=RESOURCES)
    get_one.add_argument("id")

    create = commands.add_parser("create", help="Create a resource")
    _add_value_arguments(create)

    update = commands.add_parser("update", help="Update a resource")
    _add_value_arguments(update)
    update.add_argument("--revision", type=int, help="Expected revision")

    delete = commands.add_parser("delete", help="Delete a resource")
    delete.add_argument("resource", choices=RESOURCES)
    delete.add_argument("id")
    delete.add_argument("--revision", type=int, help="Expected revision")
    delete.add_argument(
        "--yes", action="store_true", help="Confirm the destructive operation"
    )
    return parser


def run(args: argparse.Namespace) -> Any:
    if not args.base_url:
        raise ClientError("Provide --base-url or set CLASHUB_URL")
    token = os.environ.get("CLASHUB_TOKEN") or getpass.getpass("Clashub token: ")
    client = ClashubClient(args.base_url, token, args.timeout)

    if args.command == "snapshot":
        return client.request("GET", "/api/v1/admin/snapshot"), args.output
    if args.command == "list":
        return client.request("GET", _resource_path(args.resource)), None
    if args.command == "get":
        return client.request("GET", _resource_path(args.resource, args.id)), None
    if args.command == "create":
        payload = {"id": args.id, **_mutation_payload(args, creating=True)}
        return client.request("POST", _resource_path(args.resource), payload), None
    if args.command == "update":
        revision = (
            args.revision
            if args.revision is not None
            else _current_revision(client, args.resource, args.id)
        )
        payload = {
            **_mutation_payload(args, creating=False),
            "expectedRevision": revision,
        }
        return (
            client.request("PUT", _resource_path(args.resource, args.id), payload),
            None,
        )
    if args.command == "delete":
        if not args.yes:
            raise ClientError("Deletion requires --yes after explicit user confirmation")
        revision = (
            args.revision
            if args.revision is not None
            else _current_revision(client, args.resource, args.id)
        )
        return (
            client.request(
                "DELETE",
                _resource_path(args.resource, args.id),
                {"expectedRevision": revision},
            ),
            None,
        )
    raise ClientError(f"Unsupported command: {args.command}")


def main() -> int:
    parser = build_parser()
    try:
        data, output = run(parser.parse_args())
        _write_output(data, output)
        return 0
    except ClientError as error:
        result: dict[str, Any] = {"error": str(error)}
        if error.status is not None:
            result["status"] = error.status
        if error.data is not None:
            result["response"] = error.data
        print(json.dumps(result, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('{"error":"Cancelled"}', file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
