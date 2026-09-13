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
SERVER_HOST = "localhost"
WEB_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
}


def load_env_file(path: Path | None = None) -> None:
    path = path or Path(__file__).with_name(".env")
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = (part.strip() for part in line.split("=", 1))
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(name, value)


load_env_file()


def load_source_catalog(path: Path = SOURCE_CATALOG_PATH) -> dict[str, Any]:
    catalog = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(catalog.get("sources"), list) or not catalog["sources"]:
        raise ValueError("official source catalog is empty")
    return catalog


OFFICIAL_SOURCE_CATALOG = load_source_catalog()

SUPPORTED_PARTS = (
    "hood",
    "front_bumper_cover",
    "front_fender",
    "wheel_arch_trim",
    "side_mirror_housing",
)
CONCEPT_WARNING = "ROUGH VISUAL CONCEPT - NOT FOR FABRICATION"
EVIDENCE_METHODS = ("official_dimension", "public_scan_estimate", "photo_estimate", "proportional_estimate")
SOURCE_TYPES = ("official_document", "public_scan", "other_reference")


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
        "outcome": {"type": "string", "enum": ["vehicle_candidate", "rough_cad_ready", "needs_lidar"]},
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
        "partType": {"type": "string", "enum": list(SUPPORTED_PARTS)},
        "summary": {"type": "string"},
        "sourceChecks": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "officialOemChecked": {"type": "boolean"},
                "publicScansChecked": {"type": "boolean"},
                "geometrySufficient": {"type": "boolean"},
            },
            "required": ["officialOemChecked", "publicScansChecked", "geometrySufficient"],
        },
        "dimensionEvidence": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"}, "value": {"type": "string"}, "unit": {"type": "string"},
                    "tolerance": {"type": "string"},
                    "method": {"type": "string", "enum": list(EVIDENCE_METHODS)},
                    "sourceRef": {"type": "string"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                },
                "required": ["name", "value", "unit", "tolerance", "method", "sourceRef", "confidence"],
            },
        },
        "assumptions": {"type": "array", "items": {"type": "string"}},
        "sources": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "url": {"type": "string"},
                    "official": {"type": "boolean"},
                    "sourceType": {"type": "string", "enum": list(SOURCE_TYPES)},
                    "provenance": {"type": "string"},
                },
                "required": ["title", "url", "official", "sourceType", "provenance"],
            },
        },
        "cadFormat": {"type": ["string", "null"], "enum": ["OpenSCAD", None]},
        "cadPayload": {"type": ["string", "null"]},
        "explodedCadPayload": {"type": ["string", "null"]},
    },
    "required": ["outcome", "userMessage", "vehicle", "partName", "partType", "summary", "sourceChecks", "dimensionEvidence", "assumptions", "sources", "cadFormat", "cadPayload", "explodedCadPayload"],
}


def build_openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    phase = payload.get("phase")
    if phase not in {"identify", "research_and_generate"}:
        raise ValueError("invalid phase")
    image = payload.get("image_base64", "")
    if not image:
        raise ValueError("image_base64 is required")
    base64.b64decode(image, validate=True)
    user_text = str(payload.get("user_text", "")).strip()
    if len(user_text) > 2000:
        raise ValueError("user_text is longer than 2000 characters")
    vehicle = payload.get("candidate_vehicle") or {}
    part = str(payload.get("candidate_part", "")).strip()
    confirmation_text = str(payload.get("confirmation_text", "")).strip()
    if len(confirmation_text) > 2000:
        raise ValueError("confirmation_text is longer than 2000 characters")
    if phase != "identify":
        if any(not str(vehicle.get(field, "")).strip() for field in ("make", "model", "year")):
            raise ValueError("candidate vehicle make, model, and year are required")
        if part not in SUPPORTED_PARTS:
            raise ValueError("candidate part is not supported")
    indexed_sources = sources_for_vehicle(vehicle) if phase != "identify" else []
    task = (
        "Identify the vehicle make, model, approximate year, and the requested visible exterior part."
        if phase == "identify" else
        "Resolve the user's correction. Follow the required source fallback. Return rough CAD only when the available geometry is sufficient. Otherwise ask for a LiDAR scan."
    )
    prompt = f"""You are the reconstruction agent for a desktop car-part website.
Task: {task}
Supported part types: {json.dumps(SUPPORTED_PARTS)}
The wheel_arch_trim is the external trim or fender flare around the wheel opening. The front_fender is the painted body panel around the front wheel.
Initial user message: {json.dumps(user_text)}
Astra candidate vehicle: {json.dumps(vehicle)}
Astra candidate part: {json.dumps(part)}
User confirmation or correction: {json.dumps(confirmation_text)}
Pre-indexed free official dimension-bearing documents for this exact vehicle: {json.dumps(indexed_sources, separators=(',', ':'))}
For identify, return outcome=vehicle_candidate. Select exactly one supported partType. Use the initial message to decide which visible part the user wants. Set every sourceChecks value to false. Return null CAD fields, empty dimensionEvidence, empty assumptions, and empty sources. Ask the user to confirm or correct the vehicle and part in userMessage.
For research_and_generate, treat an empty correction as acceptance of the candidate. Resolve a written correction into a final vehicle and one supported partType.
Use this fallback order. Do not skip a step:
1. Search the supplied pre-indexed documents and the web for official OEM dimension sheets, body-repair measurements, service diagrams, and OEM parts diagrams for the exact make, model, year, and part. Then set sourceChecks.officialOemChecked=true.
2. If those official sources do not provide enough geometry, search the web for a public 3D scan of that exact vehicle part. Then set sourceChecks.publicScansChecked=true. Record its direct page URL, creator or repository provenance, and sourceType=public_scan. Do not call a community scan OEM, official, certified, or dimensionally exact. Use a public scan only as a geometry reference and only when its page is publicly accessible.
3. If neither official sources nor a public scan provide enough geometry for a recognizable concept, set sourceChecks.geometrySufficient=false and return outcome=needs_lidar. In userMessage, ask the user to scan the part and its attachment area with iPhone LiDAR. State that the scan must include edges, screw holes, clips, tabs, openings, and one known scale reference. Return null cadFormat, cadPayload, and explodedCadPayload. Do not return placeholder CAD.
Official dimension callouts can set scale. Exploded diagrams can guide silhouette, component boundaries, adjacency, and likely mounting locations. The uploaded photo can guide visible curvature and styling. When supported source geometry exists but exact values are absent, estimate dimensions and broad tolerances from visible proportions and known overall vehicle dimensions.
Label every value as official_dimension, public_scan_estimate, photo_estimate, or proportional_estimate. For official_dimension, use the matching official_document URL as sourceRef. For public_scan_estimate, use the matching public_scan URL. Use uploaded_photo or vehicle_proportions as sourceRef for other estimates. Give every estimate a conservative tolerance and confidence. List all material assumptions. Never present an estimate or public scan as an OEM specification.
When geometry is sufficient, set sourceChecks.geometrySufficient=true, return outcome=rough_cad_ready, and set cadFormat=OpenSCAD. Return a complete, recognizable, simplified exterior replacement-part concept in cadPayload. Return a second complete exploded-view script in explodedCadPayload. Use smooth OpenSCAD primitives, hulls, and modules where useful. Model the external shell, visible openings, and simplified attachment tabs. Do not model safety systems or claim exact fit.
Begin both scripts with this exact comment: // {CONCEPT_WARNING}
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
    required = {"outcome", "userMessage", "vehicle", "partName", "partType", "summary", "sourceChecks", "dimensionEvidence", "assumptions", "sources", "cadFormat", "cadPayload", "explodedCadPayload"}
    if not isinstance(result, dict) or not required.issubset(result):
        raise ValueError("Astra response is missing required fields")
    vehicle = result.get("vehicle")
    if not isinstance(vehicle, dict) or not {"make", "model", "year", "confidence"}.issubset(vehicle):
        raise ValueError("Astra response has an invalid vehicle")
    if result["partType"] not in SUPPORTED_PARTS:
        raise ValueError("Astra response has an unsupported part type")
    source_checks = result["sourceChecks"]
    check_fields = {"officialOemChecked", "publicScansChecked", "geometrySufficient"}
    if not isinstance(source_checks, dict) or set(source_checks) != check_fields or not all(isinstance(source_checks[field], bool) for field in check_fields):
        raise ValueError("Astra response has invalid source checks")
    if not all(isinstance(result[field], list) for field in ("dimensionEvidence", "assumptions", "sources")):
        raise ValueError("Astra response has invalid evidence collections")
    for source in result["sources"]:
        required_source = {"title", "url", "official", "sourceType", "provenance"}
        if not isinstance(source, dict) or not required_source.issubset(source):
            raise ValueError("Astra response has incomplete source provenance")
        if not source.get("url", "").startswith(("https://", "http://")):
            raise ValueError("Astra response has an invalid source URL")
        if not str(source.get("provenance", "")).strip():
            raise ValueError("Astra response has empty source provenance")
        if source["sourceType"] not in SOURCE_TYPES or not isinstance(source["official"], bool):
            raise ValueError("Astra response has an invalid source type")
        if source["sourceType"] == "official_document" and not source["official"]:
            raise ValueError("official documents must be marked official")
        if source["sourceType"] == "public_scan" and source["official"]:
            raise ValueError("public scans cannot be marked official")
    if phase == "identify":
        if result["outcome"] != "vehicle_candidate":
            raise ValueError("identify phase requires vehicle_candidate")
        if not str(result["userMessage"]).strip():
            raise ValueError("vehicle_candidate requires a confirmation question")
        if any(source_checks.values()):
            raise ValueError("vehicle_candidate cannot contain completed source checks")
        if any(value is not None for value in (result["cadFormat"], result["cadPayload"], result["explodedCadPayload"])) or any(
            (result["dimensionEvidence"], result["assumptions"], result["sources"])
        ):
            raise ValueError("vehicle_candidate cannot contain research or CAD results")
        return result
    if result["outcome"] == "needs_lidar":
        if not str(result["userMessage"]).strip() or "lidar" not in result["userMessage"].casefold():
            raise ValueError("needs_lidar requires a clear LiDAR instruction")
        if any(value is not None for value in (result["cadFormat"], result["cadPayload"], result["explodedCadPayload"])):
            raise ValueError("needs_lidar cannot contain CAD payloads")
        if source_checks != {"officialOemChecked": True, "publicScansChecked": True, "geometrySufficient": False}:
            raise ValueError("needs_lidar requires completed OEM and public scan checks")
        return result
    if result["outcome"] != "rough_cad_ready":
        raise ValueError("post-confirmation outcome must be rough_cad_ready or needs_lidar")
    if str(result["userMessage"]).strip():
        raise ValueError("rough_cad_ready cannot contain a LiDAR instruction")
    if not source_checks["officialOemChecked"] or not source_checks["geometrySufficient"]:
        raise ValueError("rough_cad_ready requires completed OEM research and sufficient geometry")
    if result["cadFormat"] != "OpenSCAD" or not result["cadPayload"] or not result["explodedCadPayload"]:
        raise ValueError("rough_cad_ready requires fitted and exploded OpenSCAD payloads")
    if not result["dimensionEvidence"] or not result["assumptions"]:
        raise ValueError("rough_cad_ready requires dimension estimates and assumptions")
    if not result["cadPayload"].startswith(f"// {CONCEPT_WARNING}") or not result["explodedCadPayload"].startswith(f"// {CONCEPT_WARNING}"):
        raise ValueError("rough CAD payloads require the concept warning")
    if not result["sources"]:
        raise ValueError("rough_cad_ready requires a supporting official document or public scan")
    official_urls = {
        source["url"] for source in result["sources"]
        if source["sourceType"] == "official_document" and source["official"]
    }
    public_scan_urls = {
        source["url"] for source in result["sources"]
        if source["sourceType"] == "public_scan" and not source["official"]
    }
    if not (official_urls or public_scan_urls):
        raise ValueError("rough_cad_ready requires a supporting official document or public scan")
    if public_scan_urls and not source_checks["publicScansChecked"]:
        raise ValueError("public scan sources require a completed public scan check")
    for item in result["dimensionEvidence"]:
        if not isinstance(item, dict) or item.get("method") not in EVIDENCE_METHODS:
            raise ValueError("rough_cad_ready has an invalid evidence method")
        if not all(str(item.get(field, "")).strip() for field in ("name", "value", "unit", "tolerance", "method", "sourceRef")):
            raise ValueError("rough_cad_ready has incomplete dimension evidence")
        if item["method"] == "official_dimension" and item["sourceRef"] not in official_urls:
            raise ValueError("rough_cad_ready has unverified official evidence")
        if item["method"] == "public_scan_estimate" and item["sourceRef"] not in public_scan_urls:
            raise ValueError("rough_cad_ready has unverified public scan evidence")
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
        if urlsplit(self.path).path not in {"/analyze", "/api/astra"}:
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
    research = build_openai_request({"phase": "research_and_generate", "image_base64": image, "candidate_vehicle": {"make": "Test", "model": "Model", "year": "2020"}, "candidate_part": "hood"})
    assert identify["model"] == "gpt-6-astra" and "tools" not in identify
    assert research["tools"] == [{"type": "web_search"}]
    print("Astra relay self-test passed")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    else:
        port = int(os.environ.get("ASTRA_RELAY_PORT", "8787"))
        print(f"CarPart CAD web app and Astra relay listening on http://{SERVER_HOST}:{port}")
        server = ThreadingHTTPServer((SERVER_HOST, port), Handler)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
