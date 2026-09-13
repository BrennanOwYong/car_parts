#!/usr/bin/env python3
"""Small development relay for the iPhone app and the OpenAI Responses API."""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


OFFICIAL_STARTING_POINTS = [
    "nhtsa.gov", "vpic.nhtsa.dot.gov", "techinfo.toyota.com",
    "techinfo.honda.com", "motorcraftservice.com", "acdelcotds.com",
    "techauthority.com",
    "service.hyundai-motor.com", "b2bconnect.mercedes-benz.com",
    "vw.servicenet.vwgroup.com",
]

ASTRA_RESULT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "outcome": {"type": "string", "enum": ["vehicle_candidate", "needs_lidar", "cad_ready"]},
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
                    "tolerance": {"type": "string"}, "method": {"type": "string", "enum": ["oem", "lidar"]},
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
    },
    "required": ["outcome", "userMessage", "vehicle", "partName", "summary", "dimensionsSufficient", "validatedAgainstEvidence", "requiredDimensions", "dimensionEvidence", "missingDimensions", "sources", "cadFormat", "cadPayload"],
}


def build_openai_request(payload: dict[str, Any]) -> dict[str, Any]:
    phase = payload.get("phase")
    if phase not in {"identify", "research_and_generate", "scan_and_generate"}:
        raise ValueError("invalid phase")
    image = payload.get("image_base64", "")
    base64.b64decode(image, validate=True)
    vehicle = payload.get("confirmed_vehicle") or {}
    if phase != "identify" and any(not str(vehicle.get(field, "")).strip() for field in ("make", "model", "year")):
        raise ValueError("confirmed vehicle make, model, and year are required")
    scan_captured = bool(payload.get("scan_captured"))
    task = (
        "Identify the vehicle make, model, approximate year, and visible damaged or selected part."
        if phase == "identify" else
        "Use the confirmed vehicle and visible part. Search official OEM or government sources for the exact part, interfaces, dimensions, and mounting constraints. Generate OpenSCAD only when the cited evidence is sufficient."
    )
    if phase == "scan_and_generate":
        task += " Use the supplied scan measurements to fill only dimensions that were missing from official evidence. This scan is an intermediate step toward the CAD result."
    prompt = f"""You are the reconstruction agent for an iPhone car-part app.
Task: {task}
Confirmed vehicle: {json.dumps(vehicle)}
LiDAR capture supplied: {scan_captured}
Start official research with these domains: {', '.join(OFFICIAL_STARTING_POINTS)}.
Never invent an OEM drawing, source URL, dimension, screw-hole center, tolerance, or part number.
For identify, use outcome=vehicle_candidate. After confirmation, use only outcome=needs_lidar or outcome=cad_ready.
Use needs_lidar when any required fit-critical dimension lacks an exact OEM or LiDAR evidence record. Put one short scan instruction in userMessage and list the absent values in missingDimensions. During scan_and_generate, request a targeted rescan of only the missing region. Continue the scan loop until the evidence supports cad_ready. Do not return partial or unsupported CAD.
Use cad_ready only when every item in requiredDimensions has a matching exact dimensionEvidence record, validatedAgainstEvidence=true, and the generated script uses those values. Set userMessage to an empty string. Set cadFormat to OpenSCAD and return a complete script in millimetres.
"""
    content: list[dict[str, Any]] = [
            {"type": "input_text", "text": prompt},
            {"type": "input_image", "image_url": f"data:image/jpeg;base64,{image}", "detail": "high"},
    ]
    scan = payload.get("scan_obj_base64")
    if phase == "scan_and_generate":
        if not scan:
            raise ValueError("scan_and_generate requires scan_obj_base64")
        base64.b64decode(scan, validate=True)
        content.append({"type": "input_file", "filename": "scan.obj", "file_data": f"data:text/plain;base64,{scan}"})
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
    required = {"outcome", "userMessage", "vehicle", "partName", "summary", "dimensionsSufficient", "validatedAgainstEvidence", "requiredDimensions", "dimensionEvidence", "missingDimensions", "sources", "cadFormat", "cadPayload"}
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
        return result
    if result["outcome"] == "needs_lidar":
        if not result["userMessage"].strip() or not result["missingDimensions"]:
            raise ValueError("needs_lidar requires a user message and missing dimensions")
        result["dimensionsSufficient"] = False
        result["validatedAgainstEvidence"] = False
        result["cadFormat"] = None
        result["cadPayload"] = None
        return result
    if result["outcome"] != "cad_ready":
        raise ValueError("post-confirmation outcome must be needs_lidar or cad_ready")
    if not result["dimensionsSufficient"] or not result["validatedAgainstEvidence"]:
        raise ValueError("cad_ready requires confirmed dimensional validation")
    if result["userMessage"] or result["missingDimensions"]:
        raise ValueError("cad_ready cannot include a user message or missing dimensions")
    if result["cadFormat"] != "OpenSCAD" or not result["cadPayload"]:
        raise ValueError("cad_ready requires an OpenSCAD payload")
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
        if item.get("method") == "lidar" and (phase != "scan_and_generate" or item.get("sourceRef") != "scan.obj"):
            raise ValueError(f"cad_ready has invalid LiDAR evidence for {name}")
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
        print(f"Astra relay listening on 0.0.0.0:{port}")
        ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
