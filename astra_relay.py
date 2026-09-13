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
from repair_chat import build_chat_request, chat_result


WEB_ROOT = Path(__file__).with_name("web").resolve()
SOURCE_CATALOG_PATH = Path(__file__).with_name("skills") / "vehicle-schematic-sourcing" / "references" / "official_sources.json"
VEHICLE_MODEL_CATALOG_PATH = Path(__file__).with_name("vehicle_model_catalog.json")
SERVER_HOST = "localhost"
WEB_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
}


def load_env_file(path: Path | None = None) -> None:
    if path is None:
        configured_path = os.environ.get("ASTRA_ENV_FILE", "").strip()
        path = Path(configured_path).expanduser() if configured_path else Path(__file__).with_name(".env")
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


def load_vehicle_model_catalog(path: Path = VEHICLE_MODEL_CATALOG_PATH) -> dict[str, Any]:
    catalog = json.loads(path.read_text(encoding="utf-8"))
    required = {"id", "make", "model", "model_years", "title", "url", "license", "creator", "format_note"}
    if not isinstance(catalog.get("models"), list) or not catalog["models"]:
        raise ValueError("vehicle model catalog is empty")
    if any(not isinstance(item, dict) or set(item) != required or not item["url"].startswith("https://") for item in catalog["models"]):
        raise ValueError("vehicle model catalog has invalid entries")
    return catalog


VEHICLE_MODEL_CATALOG = load_vehicle_model_catalog()

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


def model_assets_for_vehicle(vehicle: dict[str, Any]) -> list[dict[str, Any]]:
    make = str(vehicle.get("make", "")).strip().casefold()
    model = re.sub(r"[^a-z0-9]", "", str(vehicle.get("model", "")).casefold())
    year = str(vehicle.get("year", "")).strip()
    return [
        item for item in VEHICLE_MODEL_CATALOG["models"]
        if item["make"].casefold() == make
        and re.sub(r"[^a-z0-9]", "", item["model"].casefold()) == model
        and (item["model_years"] == "unknown" or not year or item["model_years"] == year)
    ]

ASTRA_RESULT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "outcome": {"type": "string", "enum": ["vehicle_candidate", "rough_cad_ready", "needs_lidar", "damage_review", "repair_cad_ready"]},
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


def damage_part(raw: Any) -> dict[str, Any]:
    """Validate one image-damage to CAD-part mapping."""
    if not isinstance(raw, dict):
        raise ValueError("damage part must be an object")
    required = {"id", "partType", "partName", "damageDescription", "confidence", "imageAnchor"}
    if set(raw) != required or raw["partType"] not in SUPPORTED_PARTS:
        raise ValueError("damage part has invalid fields")
    if not all(str(raw[name]).strip() for name in ("id", "partName", "damageDescription")):
        raise ValueError("damage part has empty text")
    confidence = raw["confidence"]
    anchor = raw["imageAnchor"]
    if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        raise ValueError("damage part has invalid confidence")
    if not isinstance(anchor, dict) or set(anchor) != {"x", "y"}:
        raise ValueError("damage part has invalid image anchor")
    if not all(isinstance(anchor[axis], (int, float)) and 0 <= anchor[axis] <= 1 for axis in ("x", "y")):
        raise ValueError("damage part image anchor must be normalized")
    return raw


def repair_result(text: str, phase: str) -> dict[str, Any]:
    """Read the two structured repair responses. The model has no browser trust boundary."""
    try:
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("Astra repair response was not valid JSON") from exc
    if not isinstance(result, dict):
        raise ValueError("Astra repair response must be an object")
    if phase == "damage_assessment":
        if set(result) != {"outcome", "userMessage", "vehicle", "referenceAssetId", "damageParts"} or result["outcome"] != "damage_review":
            raise ValueError("damage assessment has invalid fields")
        if not isinstance(result["vehicle"], dict) or not isinstance(result["damageParts"], list):
            raise ValueError("damage assessment has invalid values")
        if len(result["damageParts"]) > len(SUPPORTED_PARTS):
            raise ValueError("damage assessment has too many parts")
        result["damageParts"] = [damage_part(item) for item in result["damageParts"]]
        asset_id = result["referenceAssetId"]
        if not isinstance(asset_id, str):
            raise ValueError("damage assessment has invalid reference asset")
        asset = next((item for item in VEHICLE_MODEL_CATALOG["models"] if item["id"] == asset_id), None)
        if asset_id and not asset:
            raise ValueError("damage assessment selected an unknown reference asset")
        result["referenceAsset"] = asset
        return result
    if set(result) != {"outcome", "userMessage", "vehicle", "repairCad"} or result["outcome"] != "repair_cad_ready":
        raise ValueError("repair CAD response has invalid fields")
    if not isinstance(result["vehicle"], dict) or not isinstance(result["repairCad"], list) or not result["repairCad"]:
        raise ValueError("repair CAD response has invalid values")
    for item in result["repairCad"]:
        required = {"id", "partName", "partType", "cadPayload", "explodedCadPayload"}
        if not isinstance(item, dict) or set(item) != required or item["partType"] not in SUPPORTED_PARTS:
            raise ValueError("repair CAD item has invalid fields")
        if not all(str(item[field]).strip() for field in ("id", "partName", "cadPayload", "explodedCadPayload")):
            raise ValueError("repair CAD item has empty fields")
        if not item["cadPayload"].startswith(f"// {CONCEPT_WARNING}") or not item["explodedCadPayload"].startswith(f"// {CONCEPT_WARNING}"):
            raise ValueError("repair CAD payloads require the concept warning")
    return result


def build_openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    phase = payload.get("phase")
    if phase in {"repair_chat", "repair_chat_generate"}:
        return build_chat_request(payload)
    if phase not in {"identify", "research_and_generate", "damage_assessment", "repair_generate"}:
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
    previous_reply = str(payload.get("previous_reply", "")).strip()
    confirmation_text = str(payload.get("confirmation_text", "")).strip()
    if len(confirmation_text) > 2000:
        raise ValueError("confirmation_text is longer than 2000 characters")
    indexed_sources = sources_for_vehicle(vehicle) if phase not in {"identify", "damage_assessment"} else []
    model_assets = model_assets_for_vehicle(vehicle)
    source_text = "\n".join(f"- {source['name']}: {source['url']}" for source in indexed_sources) or "No pre-indexed exact-match document is available."
    candidate_text = " ".join(str(vehicle.get(field, "")).strip() for field in ("year", "make", "model") if str(vehicle.get(field, "")).strip()) or "No reliable vehicle estimate yet"
    if phase == "identify":
        prompt = f"""You are Astra, a helpful car-part reconstruction assistant. Look at the attached photo and reply in normal plain English only. Identify the vehicle as well as you can, identify the requested visible exterior part, and ask one natural follow-up question. The exterior parts in scope are hood, front bumper cover, front fender, wheel arch trim, and side mirror housing. Do not use JSON, labels, tables, checklists, or markup.

The user said: {user_text}
"""
    elif phase == "damage_assessment":
        asset_text = "\n".join(f"- {item['id']}: {item['title']} ({item['make']} {item['model']} {item['model_years']}; {item['license']})" for item in model_assets) or "No exact external reference model is cataloged."
        prompt = f"""You are Astra, a car damage review assistant. Inspect the attached current-car photograph. Map each visible collision or cosmetic damage to the matching available CAD part family. The candidate vehicle is {candidate_text}. The available CAD part families are: {', '.join(SUPPORTED_PARTS)}.

Exact external reference models available for this candidate vehicle:
{asset_text}

Return JSON only. Use exactly this shape:
{{"outcome":"damage_review","userMessage":"Damage detected on these parts." or "No supported exterior damage is visible.","vehicle":{{"make":"","model":"","year":"","confidence":0}},"referenceAssetId":"matching catalog id or empty string","damageParts":[{{"id":"short-stable-id","partType":"one available family","partName":"human readable vehicle part name","damageDescription":"visible evidence only","confidence":0.0,"imageAnchor":{{"x":0.0,"y":0.0}}}}]}}

Use normalized image coordinates: x is left to right and y is top to bottom. Include only visible damage. Do not diagnose hidden damage. Do not list a part when confidence is below 0.5. The user said: {user_text}
Your previous reply was: {previous_reply}. The user's latest correction or confirmation is: {confirmation_text}. Honor the correction and return the corrected vehicle. Only select a reference that matches the corrected vehicle."""
    elif phase == "repair_generate":
        selected = payload.get("selected_damage_parts")
        if not isinstance(selected, list) or not selected:
            raise ValueError("selected_damage_parts is required")
        selected_text = json.dumps(selected, separators=(",", ":"))
        prompt = f"""You are Astra, a car repair concept assistant. Create one rough OpenSCAD visual replacement concept for each user-confirmed damaged part. Vehicle: {candidate_text}. Confirmed mappings: {selected_text}.

Return JSON only with exactly this shape:
{{"outcome":"repair_cad_ready","userMessage":"","vehicle":{{"make":"","model":"","year":"","confidence":0}},"repairCad":[{{"id":"id from confirmed mapping","partName":"name from confirmed mapping","partType":"supported type","cadPayload":"OpenSCAD","explodedCadPayload":"OpenSCAD"}}]}}

Each CAD script must start exactly with // {CONCEPT_WARNING}. Make visual proportions plausible from the photo. Do not claim fabrication accuracy. Return only the confirmed mappings, one file pair per mapping."""
    else:
        prompt = f"""You are Astra, a helpful car-part reconstruction assistant. Continue this conversation in normal plain English. The user may say yes, correct you, ask a question, or give uncertain details. Do not require a full make, model, year, or part before you continue.

The earlier vehicle estimate was: {candidate_text}.
The earlier part estimate was: {part or 'not certain'}.
Your most recent reply was: {previous_reply or 'There is no earlier reply.'}
The user first said: {user_text}
The user now says: {confirmation_text}

First look for official OEM dimension sheets, body-repair measurements, service diagrams, and OEM part diagrams. If that is not enough, look for a public scan of the same exterior part. These pre-indexed direct-dimension sources may help:
{source_text}

If you need another detail before you can continue, ask one natural plain-English question. If all non-scan sources are exhausted and the available information is not enough, reply only with a natural plain-English request for an iPhone LiDAR scan. Ask for the part, its attachment edges, screw holes, clips, tabs, openings, and one known scale reference.

If enough information is available for a rough concept, reply only with a complete OpenSCAD script. Start the script with: // {CONCEPT_WARNING}. Include both a fitted model and an exploded-view model in the script. Do not add JSON, labels, tables, or explanatory text.
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
    }
    if phase == "research_and_generate":
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
        raise ValueError("Astra returned no text output")
    text = text.strip()
    if phase in {"damage_assessment", "repair_generate"}:
        return repair_result(text.removeprefix("```json\n").removesuffix("\n```"), phase)
    if not text.startswith("{"):
        empty_vehicle = {"make": "", "model": "", "year": "", "confidence": 0}
        if phase == "identify":
            return {"outcome": "vehicle_candidate", "userMessage": text, "vehicle": empty_vehicle, "partName": "exterior part", "partType": "front_bumper_cover", "summary": "", "sourceChecks": {"officialOemChecked": False, "publicScansChecked": False, "geometrySufficient": False}, "dimensionEvidence": [], "assumptions": [], "sources": [], "cadFormat": None, "cadPayload": None, "explodedCadPayload": None}
        if text.startswith(f"// {CONCEPT_WARNING}") or "module" in text or "cube(" in text:
            return {"outcome": "rough_cad_ready", "userMessage": "", "vehicle": empty_vehicle, "partName": "exterior part", "partType": "front_bumper_cover", "summary": "Astra created a rough CAD concept.", "sourceChecks": {"officialOemChecked": True, "publicScansChecked": True, "geometrySufficient": True}, "dimensionEvidence": [], "assumptions": [], "sources": [], "cadFormat": "OpenSCAD", "cadPayload": text, "explodedCadPayload": text}
        if "lidar" in text.casefold():
            return {"outcome": "needs_lidar", "userMessage": text, "vehicle": empty_vehicle, "partName": "exterior part", "partType": "front_bumper_cover", "summary": "", "sourceChecks": {"officialOemChecked": True, "publicScansChecked": True, "geometrySufficient": False}, "dimensionEvidence": [], "assumptions": [], "sources": [], "cadFormat": None, "cadPayload": None, "explodedCadPayload": None}
        return {"outcome": "vehicle_candidate", "userMessage": text, "vehicle": empty_vehicle, "partName": "exterior part", "partType": "front_bumper_cover", "summary": "", "sourceChecks": {"officialOemChecked": False, "publicScansChecked": False, "geometrySufficient": False}, "dimensionEvidence": [], "assumptions": [], "sources": [], "cadFormat": None, "cadPayload": None, "explodedCadPayload": None}
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
    if payload.get('phase') == 'repair_chat_generate':
        from repair_library import saved_repair_parts
        return saved_repair_parts(payload)
    request_body = build_openai_request(payload)
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to .env next to astra_relay.py, "
            "or set ASTRA_ENV_FILE to the full path of your .env file."
        )
    body = json.dumps(request_body).encode()
    request = urllib.request.Request("https://api.openai.com/v1/responses", data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=180) as response:
        output = json.load(response)
        if payload["phase"] in {"repair_chat", "repair_chat_generate"}:
            text = output.get("output_text") or "\n".join(content.get("text", "") for item in output.get("output", []) if item.get("type") == "message" for content in item.get("content", []) if content.get("type") == "output_text")
            return chat_result(text, payload)
        return extract_result(output, payload["phase"])


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
