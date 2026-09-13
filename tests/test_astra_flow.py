#!/usr/bin/env python3
import base64
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from astra_relay import ASTRA_RESULT_SCHEMA, Handler, SUPPORTED_PARTS, build_openai_request, extract_result, load_env_file  # noqa: E402


def astra_result(**changes):
    value = {
        "outcome": "rough_cad_ready",
        "userMessage": "",
        "vehicle": {"make": "Mazda", "model": "3", "year": "2021", "confidence": 0.82},
        "partName": "left front fender",
        "partType": "front_fender",
        "summary": "Rough visual concept based on the uploaded image and vehicle proportions.",
        "sourceChecks": {
            "officialOemChecked": True,
            "publicScansChecked": False,
            "geometrySufficient": True,
        },
        "dimensionEvidence": [
            {
                "name": "overall length",
                "value": "1080",
                "unit": "mm",
                "tolerance": "+/- 80 mm",
                "method": "photo_estimate",
                "sourceRef": "uploaded_photo",
                "confidence": 0.55,
            }
        ],
        "assumptions": ["The wheel opening is approximated from visible proportions."],
        "sources": [
            {
                "title": "Mazda body repair manual",
                "url": "https://example.com/mazda-body-manual",
                "official": True,
                "sourceType": "official_document",
                "provenance": "Mazda service publication",
            }
        ],
        "cadFormat": "OpenSCAD",
        "cadPayload": "// ROUGH VISUAL CONCEPT - NOT FOR FABRICATION\ncube([1,1,1]);",
        "explodedCadPayload": "// ROUGH VISUAL CONCEPT - NOT FOR FABRICATION\ntranslate([0,0,10]) cube([1,1,1]);",
    }
    value.update(changes)
    return value


class AstraFlowChecks(unittest.TestCase):
    def setUp(self):
        self.image = base64.b64encode(b"fixture").decode()

    def test_supported_exterior_parts_are_exactly_scoped(self):
        self.assertEqual(
            set(SUPPORTED_PARTS),
            {"hood", "front_bumper_cover", "front_fender", "wheel_arch_trim", "side_mirror_housing"},
        )
        enum = ASTRA_RESULT_SCHEMA["properties"]["partType"]["enum"]
        self.assertEqual(set(enum), set(SUPPORTED_PARTS))

    def test_identification_uses_image_and_supported_part_scope_without_search(self):
        request = build_openai_request({"phase": "identify", "image_base64": self.image, "user_text": "The trim around the front wheel"})
        self.assertEqual(request["model"], "gpt-6-astra")
        self.assertNotIn("tools", request)
        self.assertEqual(request["input"][0]["content"][1]["type"], "input_image")
        prompt = request["input"][0]["content"][0]["text"]
        self.assertIn("wheel arch trim", prompt)
        self.assertIn("The trim around the front wheel", prompt)

    def test_user_text_length_is_limited(self):
        with self.assertRaises(ValueError):
            build_openai_request({"phase": "identify", "image_base64": self.image, "user_text": "x" * 2001})

    def test_env_file_loads_key_without_overriding_process_environment(self):
        previous = os.environ.get("TEST_CARPART_KEY")
        try:
            os.environ.pop("TEST_CARPART_KEY", None)
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / ".env"
                path.write_text('TEST_CARPART_KEY="from-file"\n')
                load_env_file(path)
                self.assertEqual(os.environ["TEST_CARPART_KEY"], "from-file")
                os.environ["TEST_CARPART_KEY"] = "from-process"
                load_env_file(path)
                self.assertEqual(os.environ["TEST_CARPART_KEY"], "from-process")
        finally:
            if previous is None:
                os.environ.pop("TEST_CARPART_KEY", None)
            else:
                os.environ["TEST_CARPART_KEY"] = previous

    def test_env_file_can_be_set_with_astra_env_file(self):
        previous_path = os.environ.get("ASTRA_ENV_FILE")
        previous_value = os.environ.get("TEST_CARPART_ENV_FILE_KEY")
        try:
            os.environ.pop("TEST_CARPART_ENV_FILE_KEY", None)
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "custom.env"
                path.write_text("TEST_CARPART_ENV_FILE_KEY=from-custom-file\n")
                os.environ["ASTRA_ENV_FILE"] = str(path)
                load_env_file()
                self.assertEqual(os.environ["TEST_CARPART_ENV_FILE_KEY"], "from-custom-file")
        finally:
            if previous_path is None:
                os.environ.pop("ASTRA_ENV_FILE", None)
            else:
                os.environ["ASTRA_ENV_FILE"] = previous_path
            if previous_value is None:
                os.environ.pop("TEST_CARPART_ENV_FILE_KEY", None)
            else:
                os.environ["TEST_CARPART_ENV_FILE_KEY"] = previous_value

    def test_research_searches_references_and_requests_rough_cad(self):
        request = build_openai_request({
            "phase": "research_and_generate",
            "image_base64": self.image,
            "candidate_vehicle": {"make": "Mazda", "model": "3", "year": "2021"},
            "candidate_part": "front_fender",
        })
        self.assertEqual(request["tools"], [{"type": "web_search"}])
        prompt = request["input"][0]["content"][0]["text"]
        for value in ("official", "diagram", "public scan", "LiDAR", "front_fender", "ROUGH VISUAL CONCEPT - NOT FOR FABRICATION"):
            self.assertIn(value, prompt)
        self.assertNotIn("json_schema", prompt)
        self.assertNotIn("text", request)
        self.assertFalse(request["store"])

    def test_rough_result_accepts_estimates_without_official_dimensions(self):
        parsed = extract_result({"output_text": json.dumps(astra_result())}, "research_and_generate")
        self.assertEqual(parsed["outcome"], "rough_cad_ready")
        self.assertEqual(parsed["dimensionEvidence"][0]["method"], "photo_estimate")

    def test_public_scan_evidence_requires_matching_provenance(self):
        scan_url = "https://example.org/scans/mazda3-fender"
        result = astra_result(
            sourceChecks={"officialOemChecked": True, "publicScansChecked": True, "geometrySufficient": True},
            sources=[{
                "title": "Community Mazda 3 fender scan",
                "url": scan_url,
                "official": False,
                "sourceType": "public_scan",
                "provenance": "Scanned and published by Example User",
            }],
            dimensionEvidence=[{
                "name": "wheel opening arc",
                "value": "estimated from mesh",
                "unit": "shape reference",
                "tolerance": "unknown",
                "method": "public_scan_estimate",
                "sourceRef": scan_url,
                "confidence": 0.62,
            }],
        )
        parsed = extract_result({"output_text": json.dumps(result)}, "research_and_generate")
        self.assertEqual(parsed["sources"][0]["sourceType"], "public_scan")
        self.assertFalse(parsed["sources"][0]["official"])

        result["sources"][0]["official"] = True
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(result)}, "research_and_generate")

    def test_public_scan_evidence_rejects_unmatched_url(self):
        evidence = astra_result()["dimensionEvidence"]
        evidence[0].update(method="public_scan_estimate", sourceRef="https://example.org/missing-scan")
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(astra_result(dimensionEvidence=evidence))}, "research_and_generate")

    def test_invalid_source_type_and_empty_provenance_are_rejected(self):
        for change in ({"sourceType": "social_post"}, {"provenance": ""}, {"official": "yes"}):
            source = {**astra_result()["sources"][0], **change}
            with self.subTest(change=change):
                with self.assertRaises(ValueError):
                    extract_result({"output_text": json.dumps(astra_result(sources=[source]))}, "research_and_generate")

    def test_rough_result_requires_both_cad_files_and_assumptions(self):
        for change in ({"cadPayload": None}, {"explodedCadPayload": None}, {"assumptions": []}, {"dimensionEvidence": []}):
            with self.subTest(change=change):
                with self.assertRaises(ValueError):
                    extract_result({"output_text": json.dumps(astra_result(**change))}, "research_and_generate")

    def test_rough_cad_files_require_concept_warning(self):
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(astra_result(cadPayload="cube(1);"))}, "research_and_generate")

    def test_rough_cad_rejects_lidar_text_and_invalid_evidence_method(self):
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(astra_result(userMessage="Use LiDAR."))}, "research_and_generate")
        evidence = astra_result()["dimensionEvidence"]
        evidence[0]["method"] = "invented"
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(astra_result(dimensionEvidence=evidence))}, "research_and_generate")

    def test_identify_result_cannot_release_cad(self):
        result = astra_result(
            outcome="vehicle_candidate",
            userMessage="I found a Mazda 3 front fender. Is that correct?",
            dimensionEvidence=[],
            assumptions=[],
            sources=[],
            sourceChecks={"officialOemChecked": False, "publicScansChecked": False, "geometrySufficient": False},
            cadFormat=None,
            cadPayload=None,
            explodedCadPayload=None,
        )
        parsed = extract_result({"output_text": json.dumps(result)}, "identify")
        self.assertIsNone(parsed["cadPayload"])
        self.assertIsNone(parsed["explodedCadPayload"])

        result["cadPayload"] = "cube(1);"
        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps(result)}, "identify")

    def test_research_accepts_uncertain_candidate_as_a_conversation_turn(self):
        request = build_openai_request({
            "phase": "research_and_generate",
            "image_base64": self.image,
            "candidate_vehicle": {"make": "Tesla", "model": "Model 3", "year": "2017–2023"},
            "candidate_part": "",
            "confirmation_text": "yes",
        })
        prompt = request["input"][0]["content"][0]["text"]
        self.assertIn("2017–2023 Tesla Model 3", prompt)
        self.assertIn("Do not require a full make, model, year, or part", prompt)

    def test_lidar_fallback_requires_instruction_and_null_cad(self):
        lidar = astra_result(
            outcome="needs_lidar",
            userMessage="Use iPhone LiDAR to scan the part, attachment edges, screw holes, clips, tabs, openings, and a scale reference.",
            sourceChecks={"officialOemChecked": True, "publicScansChecked": True, "geometrySufficient": False},
            cadFormat=None,
            cadPayload=None,
            explodedCadPayload=None,
        )
        parsed = extract_result({"output_text": json.dumps(lidar)}, "research_and_generate")
        self.assertEqual(parsed["outcome"], "needs_lidar")

        for change in ({"userMessage": "Please send another photo."}, {"cadPayload": "cube(1);"}, {"cadFormat": ""}):
            with self.subTest(change=change):
                with self.assertRaises(ValueError):
                    extract_result({"output_text": json.dumps({**lidar, **change})}, "research_and_generate")

        with self.assertRaises(ValueError):
            extract_result({"output_text": json.dumps({
                **lidar,
                "sourceChecks": {"officialOemChecked": True, "publicScansChecked": False, "geometrySufficient": False},
            })}, "research_and_generate")

    def test_post_confirmation_has_two_result_outcomes(self):
        outcomes = ASTRA_RESULT_SCHEMA["properties"]["outcome"]["enum"]
        self.assertEqual(set(outcomes) - {"vehicle_candidate"}, {"rough_cad_ready", "needs_lidar"})

    def test_schema_declares_evidence_and_source_types(self):
        evidence_methods = ASTRA_RESULT_SCHEMA["properties"]["dimensionEvidence"]["items"]["properties"]["method"]["enum"]
        self.assertEqual(
            set(evidence_methods),
            {"official_dimension", "public_scan_estimate", "photo_estimate", "proportional_estimate"},
        )
        source_types = ASTRA_RESULT_SCHEMA["properties"]["sources"]["items"]["properties"]["sourceType"]["enum"]
        self.assertEqual(set(source_types), {"official_document", "public_scan", "other_reference"})

    def test_schema_disallows_extra_fields(self):
        self.assertFalse(ASTRA_RESULT_SCHEMA["additionalProperties"])

    def test_relay_keeps_existing_endpoint_and_contract_alias(self):
        constants = Handler.do_POST.__code__.co_consts
        endpoints = next(value for value in constants if isinstance(value, frozenset))
        self.assertEqual(endpoints, frozenset({"/analyze", "/api/astra"}))


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("Astra flow checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
