#!/usr/bin/env python3
"""Development server for the desktop website and OpenAI Responses API."""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


WEB_ROOT = Path(__file__).with_name("web").resolve()
SOURCE_CATALOG_PATH = Path(__file__).with_name("skills") / "vehicle-schematic-sourcing" / "references" / "official_sources.json"
WEB_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
}


def load_source_catalog(path: Path = SOURCE_CATALOG_PATH) -> dict[str, Any]:
    catalog = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(catalog.get("sources"), list) or not catalog["sources"]:
        raise ValueError("official source catalog is empty")
    return catalog


OFFICIAL_SOURCE_CATALOG = load_source_catalog()


def sources_for_vehicle(vehicle: dict[str, Any]) -> list[dict[str, Any]]:
    make = str(vehicle.get("make", "")).strip().casefold()
    model = re.sub(r"[^a-z0-9]", "", str(vehicle.get("model", "")).casefold())
    year_text = str(vehicle.get("year", "")).strip()
    year = int(year_text) if year_text.isdigit() else None

    def matches_year(span: str) -> bool:
        if year is None:
            return False
        if span.endswith("+") and span[:-1].isdigit():
            return year >= int(span[:-1])
        if "-" in span:
            start, end = span.split("-", 1)
            return start.isdigit() and end.isdigit() and int(start) <= year <= int(end)
        return span.isdigit() and year == int(span)

    return [
        source for source in OFFICIAL_SOURCE_CATALOG["sources"]
        if make in {item.casefold() for item in source["makes"]}
        and model in {re.sub(r"[^a-z0-9]", "", item.casefold()) for item in source["models"]}
        and matches_year(source["model_years"])
    ]

ASTRA_RESULT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "outcome": {"type": "string", "enum": ["vehicle_candidate", "needs_dimensions", "cad_ready"]},
        "userMessage": {"type": "string"},
        "vehicle": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "make": {"type": "string"}, "model": {"type": "string"},
                "year": {"type": "string"}, "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["make", "model", "year", "confidence"],
        },
        "partName": {"type": "string"},
        "summary": {"type": "string"},
        "dimensionsSufficient": {"type": "boolean"},
        "validatedAgainstEvidence": {"type": "boolean"},
        "requiredDimensions": {"type": "array", "items": {"type": "string"}},
        "dimensionEvidence": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"}, "value": {"type": "string"}, "unit": {"type": "string"},
                    "tolerance": {"type": "string"}, "method": {"type": "string", "enum": ["oem"]},
                    "sourceRef": {"type": "string"}, "exact": {"type": "boolean"},
                },
                "required": ["name", "value", "unit", "tolerance", "method", "sourceRef", "exact"],
            },
        },
        "missingDimensions": {"type": "array", "items": {"type": "string"}},
        "sources": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "properties": {"title": {"type": "string"}, "url": {"type": "string"}, "official": {"type": "boolean"}},
                "required": ["title", "url", "official"],
            },
        },
        "cadFormat": {"type": ["string", "null"], "enum": ["OpenSCAD", None]},
        "cadPayload": {"type": ["string", "null"]},
        "explodedCadPayload": {"type": ["string", "null"]},
    },
    "required": ["outcome", "userMessage", "vehicle", "partName", "summary", "dimensionsSufficient", "validatedAgainstEvidence", "requiredDimensions", "dimensionEvidence", "missingDimensions", "sources", "cadFormat", "cadPayload", "explodedCadPayload"],
}


def build_openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    phase = payload.get("phase")
    if phase not in {"identify", "research_and_generate"}:
        raise ValueError("invalid phase")
    image = payload.get("image_base64", "")
    base64.b64decode(image, validate=True)
    user_text = str(payload.get("user_text", "")).strip()
    if len(user_text) > 2000:
        raise ValueError("user_text is longer than 2000 characters")
    vehicle = payload.get("confirmed_vehicle") or {}
    if phase != "identify" and any(not str(vehicle.get(field, "")).strip() for field in ("make", "model", "year")):
        raise ValueError("confirmed vehicle make, model, and year are required")
    indexed_sources = sources_for_vehicle(vehicle) if phase != "identify" else []
    task = (
        "Identify the vehicle make, model, approximate year, and visible damaged or selected part."
        if phase == "identify" else
        "Use the confirmed vehicle and visible part. Search direct official documents for the exact part, interfaces, dimensions, and mounting constraints. Generate OpenSCAD only when the cited evidence is sufficient."
    )
    prompt = f"""You are the reconstruction agent for a desktop car-part website.
Task: {task}
Confirmed vehicle: {json.dumps(vehicle)}
User description: {json.dumps(user_text)}
Pre-indexed free official dimension-bearing documents for this exact vehicle: {json.dumps(indexed_sources, separators=(',', ':'))}
Search the pre-indexed dimensional documents before general web search. The catalog was researched before this job, but each document and vehicle applicability must still be verified.
Use an official source as dimensional evidence only when the direct page or file states the value. Never infer dimensions, hole positions, tolerances, or scale from an exploded diagram, photograph, or prose description.
Never invent an OEM drawing, source URL, dimension, screw-hole center, tolerance, or part number.
For identify, use outcome=vehicle_candidate. After confirmation, use only outcome=needs_dimensions or outcome=cad_ready.
Use needs_dimensions when any required fit-critical dimension lacks an exact OEM evidence record. Explain that official dimensional evidence was insufficient. List the absent values in missingDimensions. Do not return partial or unsupported CAD.
Use cad_ready only when every item in requiredDimensions has a matching exact dimensionEvidence record, validatedAgainstEvidence=true, and both generated scripts use those values. Set userMessage to an empty string. Set cadFormat to OpenSCAD. Return the fitted model in cadPayload. Return a second complete OpenSCAD script in explodedCadPayload. The exploded script must separate only modeled components and mounting elements supported by the evidence. Do not invent hidden components or dimensions.
"""
    content: list[dict[str, Any]] = [
            {"type": "input_text", "text": prompt},
            {"type": "input_image", "image_url": f"data:image/jpeg;base64,{image}", "detail": "high"},
    ]
    request: dict[str, Any] = {
        "model": "gpt-6-astra",
        "input": [{"role": "user", "content": content}],
        "reasoning": {"effort": "high"},
        "store": False,
        "text": {"format": {"type": "json_schema", "name": "car_part_result", "strict": True, "schema": ASTRA_RESULT_SCHEMA}},
    }
    if phase != "identify":
        request["tools"] = [{"type": "web_search"}]
        request["include"] = ["web_search_call.action.sources"]
    return request


def extract_result(response: dict[str, Any], phase: str | None = None) -> dict[str, Any]:
    text = response.get("output_text")
    if not text:
        for item in response.get("output", []):
            if item.get("type") == "message":
                for content in item.get("content", []):
                    if content.get("type") == "output_text":
                        text = content.get("text")
                        break
    if not text:
        raise ValueError("Astra returned no JSON output")
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    result = json.loads(text)
    required = {"outcome", "userMessage", "vehicle", "partName", "summary", "dimensionsSufficient", "validatedAgainstEvidence", "requiredDimensions", "dimensionEvidence", "missingDimensions", "sources", "cadFormat", "cadPayload", "explodedCadPayload"}
    if not required.issubset(result):
        raise ValueError("Astra response is missing required fields")
    vehicle = result.get("vehicle")
    if not isinstance(vehicle, dict) or not {"make", "model", "year", "confidence"}.issubset(vehicle):
        raise ValueError("Astra response has an invalid vehicle")
    if not isinstance(result["dimensionsSufficient"], bool):
        raise ValueError("Astra response has an invalid dimensionsSufficient value")
    for source in result["sources"]:
        if not isinstance(source, dict) or not source.get("url", "").startswith(("https://", "http://")):
            raise ValueError("Astra response has an invalid source URL")
    if phase == "identify":
        if result["outcome"] != "vehicle_candidate":
            raise ValueError("identify phase requires vehicle_candidate")
        result["cadFormat"] = None
        result["cadPayload"] = None
        result["explodedCadPayload"] = None
        return result
    if result["outcome"] == "needs_dimensions":
        if not result["userMessage"].strip() or not result["missingDimensions"]:
            raise ValueError("needs_dimensions requires a user message and missing dimensions")
        result["dimensionsSufficient"] = False
        result["validatedAgainstEvidence"] = False
        result["cadFormat"] = None
        result["cadPayload"] = None
        result["explodedCadPayload"] = None
        return result
    if result["outcome"] != "cad_ready":
        raise ValueError("post-confirmation outcome must be needs_dimensions or cad_ready")
    if not result["dimensionsSufficient"] or not result["validatedAgainstEvidence"]:
        raise ValueError("cad_ready requires confirmed dimensional validation")
    if result["userMessage"] or result["missingDimensions"]:
        raise ValueError("cad_ready cannot include a user message or missing dimensions")
    if result["cadFormat"] != "OpenSCAD" or not result["cadPayload"] or not result["explodedCadPayload"]:
        raise ValueError("cad_ready requires fitted and exploded OpenSCAD payloads")
    required_dimensions = set(result["requiredDimensions"])
    evidence = {item.get("name"): item for item in result["dimensionEvidence"]}
    if not required_dimensions or not required_dimensions.issubset(evidence):
        raise ValueError("cad_ready lacks evidence for required dimensions")
    official_urls = {source["url"] for source in result["sources"] if source.get("official")}
    for name in required_dimensions:
        item = evidence[name]
        if not item.get("exact") or not item.get("value") or not item.get("unit") or not item.get("tolerance"):
            raise ValueError(f"cad_ready has incomplete evidence for {name}")
        if item.get("method") == "oem" and item.get("sourceRef") not in official_urls:
            raise ValueError(f"cad_ready has unverified OEM evidence for {name}")
        if item.get("method") != "oem":
            raise ValueError(f"cad_ready has unsupported evidence for {name}")
    return result


def call_openai(payload: dict[str, Any]) -> dict[str, Any]:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    body = json.dumps(build_openai_request(payload)).encode()
    request = urllib.request.Request("https://api.openai.com/v1/responses", data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=180) as response:
        return extract_result(json.load(response), payload["phase"])


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/health":
            self.send_bytes(b'{"status":"ok"}', "application/json; charset=utf-8")
            return
        asset = WEB_FILES.get(path)
        if not asset:
            self.send_error(404)
            return
        filename, content_type = asset
        try:
            data = (WEB_ROOT / filename).read_bytes()
        except OSError:
            self.send_error(404)
            return
        self.send_bytes(data, content_type)

    def do_POST(self) -> None:
        if self.path != "/analyze":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 20_000_000:
                raise ValueError("invalid request size")
            result = call_openai(json.loads(self.rfile.read(length)))
            data, status = json.dumps(result).encode(), 200
        except (ValueError, RuntimeError, urllib.error.URLError) as exc:
            data, status = json.dumps({"error": str(exc)}).encode(), 400
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_bytes(self, data: bytes, content_type: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:
        print(format % args)


def self_test() -> None:
    image = base64.b64encode(b"test image").decode()
    identify = build_openai_request({"phase": "identify", "image_base64": image})
    research = build_openai_request({"phase": "research_and_generate", "image_base64": image, "confirmed_vehicle": {"make": "Test", "model": "Model", "year": "2020"}})
    assert identify["model"] == "gpt-6-astra" and "tools" not in identify
    assert research["tools"] == [{"type": "web_search"}]
    print("Astra relay self-test passed")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    else:
        port = int(os.environ.get("ASTRA_RELAY_PORT", "8787"))
        print(f"CarPart CAD web app and Astra relay listening on http://0.0.0.0:{port}")
        server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
