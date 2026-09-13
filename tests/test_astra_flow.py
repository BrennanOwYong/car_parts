#!/usr/bin/env python3
import base64
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from astra_relay import ASTRA_RESULT_SCHEMA, build_openai_request, extract_result  # noqa: E402


def astra_result(**changes):
    value = {
        "outcome": "needs_lidar", "userMessage": "Use the LiDAR scanner.",
        "vehicle": {"make": "A", "model": "B", "year": "2020", "confidence": 1},
        "partName": "clip", "summary": "internal", "dimensionsSufficient": False,
        "validatedAgainstEvidence": False, "requiredDimensions": ["hole center"],
        "dimensionEvidence": [], "missingDimensions": ["hole center"], "sources": [],
        "cadFormat": None, "cadPayload": None,
    }
    value.update(changes)
    return value


class AstraFlowChecks(unittest.TestCase):
    def setUp(self):
        self.image = base64.b64encode(b"fixture").decode()

    def test_identification_uses_astra_image_without_search(self):
        request = build_openai_request({"phase": "identify", "image_base64": self.image, "user_text": "Broken mirror mount"})
        self.assertEqual(request["model"], "gpt-6-astra")
        self.assertNotIn("tools", request)
        self.assertEqual(request["input"][0]["content"][1]["type"], "input_image")
        self.assertIn("Broken mirror mount", request["input"][0]["content"][0]["text"])

    def test_user_text_length_is_limited(self):
        with self.assertRaises(ValueError):
            build_openai_request({"phase": "identify", "image_base64": self.image, "user_text": "x" * 2001})

    def test_research_uses_web_search_and_requires_evidence(self):
        request = build_openai_request({"phase": "research_and_generate", "image_base64": self.image, "confirmed_vehicle": {"make": "A", "model": "B", "year": "2020"}})
        self.assertEqual(request["tools"], [{"type": "web_search"}])
        prompt = request["input"][0]["content"][0]["text"]
        self.assertIn("Never invent", prompt)
        self.assertIn("missingDimensions", prompt)
        self.assertEqual(request["text"]["format"]["type"], "json_schema")
        self.assertTrue(request["text"]["format"]["strict"])
        self.assertFalse(request["store"])

    def test_insufficient_dimensions_remove_cad(self):
        result = astra_result(cadFormat="OpenSCAD", cadPayload="bad")
        parsed = extract_result({"output_text": json.dumps(result)}, "research_and_generate")
        self.assertIsNone(parsed["cadPayload"])

    def test_invalid_ready_result_without_cad_is_rejected(self):
        result = astra_result(outcome="cad_ready", userMessage="", dimensionsSufficient=True, validatedAgainstEvidence=True, missingDimensions=[])
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(result)}, "research_and_generate")

    def test_lidar_is_conditional_in_ui(self):
        ui = (ROOT / "CarPartCAD" / "ContentView.swift").read_text()
        self.assertIn("if model.needsLiDAR", ui)
        self.assertNotIn("Official source index", ui)
        self.assertNotIn("Astra evidence", ui)
        self.assertNotIn("result.sources", ui)
        self.assertNotIn("result.missingDimensions", ui)

    def test_scan_phase_sends_obj_file(self):
        request = build_openai_request({"phase": "scan_and_generate", "image_base64": self.image, "scan_obj_base64": self.image, "confirmed_vehicle": {"make": "A", "model": "B", "year": "2020"}})
        content = request["input"][0]["content"]
        self.assertEqual(content[-1]["type"], "input_file")
        self.assertEqual(content[-1]["filename"], "scan.obj")

    def test_lidar_save_submits_scan_without_second_action(self):
        capture = (ROOT / "CarPartCAD" / "CaptureViews.swift").read_text()
        ui = (ROOT / "CarPartCAD" / "ContentView.swift").read_text()
        model = (ROOT / "CarPartCAD" / "ReconstructionModel.swift").read_text()
        self.assertIn("await model.submitScan(url)", capture)
        self.assertIn("func submitScan(_ url: URL) async", model)
        self.assertNotIn("Send scan to Astra", ui)

    def test_incomplete_scan_requests_targeted_rescan(self):
        request = build_openai_request({"phase": "scan_and_generate", "image_base64": self.image, "scan_obj_base64": self.image, "confirmed_vehicle": {"make": "A", "model": "B", "year": "2020"}})
        prompt = request["input"][0]["content"][0]["text"]
        self.assertIn("intermediate step toward the CAD result", prompt)
        self.assertIn("request a targeted rescan", prompt)
        self.assertIn("Do not return partial or unsupported CAD", prompt)

    def test_vehicle_fields_and_cad_share_are_in_ui(self):
        ui = (ROOT / "CarPartCAD" / "ContentView.swift").read_text()
        model = (ROOT / "CarPartCAD" / "ReconstructionModel.swift").read_text()
        self.assertIn('TextField("Make"', ui)
        self.assertIn('TextField("Model"', ui)
        self.assertIn('TextField("Year"', ui)
        self.assertIn("ShareLink(item: file)", ui)
        self.assertIn("cadFileURL = url", model)

    def test_schema_disallows_extra_fields(self):
        self.assertFalse(ASTRA_RESULT_SCHEMA["additionalProperties"])

    def test_cad_ready_requires_exact_evidence_for_every_dimension(self):
        source = {"title": "OEM", "url": "https://oem.example/part", "official": True}
        evidence = {"name": "hole center", "value": "10,20,0", "unit": "mm", "tolerance": "+/-0.1", "method": "oem", "sourceRef": source["url"], "exact": True}
        result = astra_result(outcome="cad_ready", userMessage="", dimensionsSufficient=True, validatedAgainstEvidence=True, dimensionEvidence=[evidence], missingDimensions=[], sources=[source], cadFormat="OpenSCAD", cadPayload="cube([1,1,1]);")
        parsed = extract_result({"output_text": json.dumps(result)}, "research_and_generate")
        self.assertEqual(parsed["outcome"], "cad_ready")
        result["dimensionEvidence"] = []
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(result)}, "research_and_generate")

    def test_post_confirmation_has_only_two_outcomes(self):
        outcomes = ASTRA_RESULT_SCHEMA["properties"]["outcome"]["enum"]
        self.assertEqual(set(outcomes) - {"vehicle_candidate"}, {"needs_lidar", "cad_ready"})

    def test_research_requires_vehicle_confirmation(self):
        with self.assertRaises(ValueError):
            build_openai_request({"phase": "research_and_generate", "image_base64": self.image})


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("Astra flow checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
