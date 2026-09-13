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
        "outcome": "needs_dimensions",
        "userMessage": "Official dimensional evidence is incomplete.",
        "vehicle": {"make": "A", "model": "B", "year": "2020", "confidence": 1},
        "partName": "clip",
        "summary": "internal",
        "dimensionsSufficient": False,
        "validatedAgainstEvidence": False,
        "requiredDimensions": ["hole center"],
        "dimensionEvidence": [],
        "missingDimensions": ["hole center"],
        "sources": [],
        "cadFormat": None,
        "cadPayload": None,
        "explodedCadPayload": None,
    }
    value.update(changes)
    return value


class AstraFlowChecks(unittest.TestCase):
    def setUp(self):
        self.image = base64.b64encode(b"fixture").decode()

    def test_identification_uses_uploaded_image_without_search(self):
        request = build_openai_request({"phase": "identify", "image_base64": self.image, "user_text": "Broken mirror mount"})
        self.assertEqual(request["model"], "gpt-6-astra")
        self.assertNotIn("tools", request)
        self.assertEqual(request["input"][0]["content"][1]["type"], "input_image")
        self.assertIn("Broken mirror mount", request["input"][0]["content"][0]["text"])

    def test_user_text_length_is_limited(self):
        with self.assertRaises(ValueError):
            build_openai_request({"phase": "identify", "image_base64": self.image, "user_text": "x" * 2001})

    def test_research_uses_web_search_and_requires_exact_evidence(self):
        request = build_openai_request({"phase": "research_and_generate", "image_base64": self.image, "confirmed_vehicle": {"make": "A", "model": "B", "year": "2020"}})
        self.assertEqual(request["tools"], [{"type": "web_search"}])
        prompt = request["input"][0]["content"][0]["text"]
        self.assertIn("Never invent", prompt)
        self.assertIn("needs_dimensions", prompt)
        self.assertIn("explodedCadPayload", prompt)
        self.assertEqual(request["text"]["format"]["type"], "json_schema")
        self.assertTrue(request["text"]["format"]["strict"])
        self.assertFalse(request["store"])

    def test_insufficient_dimensions_remove_both_cad_outputs(self):
        result = astra_result(cadFormat="OpenSCAD", cadPayload="bad", explodedCadPayload="bad")
        parsed = extract_result({"output_text": json.dumps(result)}, "research_and_generate")
        self.assertIsNone(parsed["cadPayload"])
        self.assertIsNone(parsed["explodedCadPayload"])

    def test_missing_dimension_result_requires_named_dimensions(self):
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(astra_result(missingDimensions=[]))}, "research_and_generate")

    def test_invalid_ready_result_without_exploded_view_is_rejected(self):
        result = astra_result(outcome="cad_ready", userMessage="", dimensionsSufficient=True, validatedAgainstEvidence=True, missingDimensions=[], cadFormat="OpenSCAD", cadPayload="cube(1);")
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(result)}, "research_and_generate")

    def test_cad_ready_requires_exact_official_evidence_for_every_dimension(self):
        source = {"title": "OEM", "url": "https://oem.example/part", "official": True}
        evidence = {"name": "hole center", "value": "10,20,0", "unit": "mm", "tolerance": "+/-0.1", "method": "oem", "sourceRef": source["url"], "exact": True}
        result = astra_result(
            outcome="cad_ready", userMessage="", dimensionsSufficient=True,
            validatedAgainstEvidence=True, dimensionEvidence=[evidence],
            missingDimensions=[], sources=[source], cadFormat="OpenSCAD",
            cadPayload="cube([1,1,1]);", explodedCadPayload="translate([0,0,10]) cube([1,1,1]);",
        )
        parsed = extract_result({"output_text": json.dumps(result)}, "research_and_generate")
        self.assertEqual(parsed["outcome"], "cad_ready")
        result["dimensionEvidence"] = []
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(result)}, "research_and_generate")

    def test_post_confirmation_has_only_two_outcomes(self):
        outcomes = ASTRA_RESULT_SCHEMA["properties"]["outcome"]["enum"]
        self.assertEqual(set(outcomes) - {"vehicle_candidate"}, {"needs_dimensions", "cad_ready"})

    def test_schema_disallows_extra_fields(self):
        self.assertFalse(ASTRA_RESULT_SCHEMA["additionalProperties"])

    def test_research_requires_vehicle_confirmation(self):
        with self.assertRaises(ValueError):
            build_openai_request({"phase": "research_and_generate", "image_base64": self.image})

    def test_scan_phase_is_not_supported(self):
        with self.assertRaises(ValueError):
            build_openai_request({"phase": "scan_and_generate", "image_base64": self.image})


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("Astra flow checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
