#!/usr/bin/env python3
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from astra_relay import SOURCE_CATALOG_PATH, build_openai_request, sources_for_vehicle  # noqa: E402


class SourceCatalogChecks(unittest.TestCase):
    def test_catalog_contains_only_direct_dimension_documents(self):
        catalog = json.loads(SOURCE_CATALOG_PATH.read_text())
        self.assertGreaterEqual(len(catalog["sources"]), 6)
        self.assertEqual(catalog["version"], 2)
        self.assertEqual(catalog["verified_on"], "2026-09-13")
        allowed_types = {"collision_dimensional_specification", "body_builder_manual", "upfitter_guide"}
        for source in catalog["sources"]:
            self.assertTrue(source["official"])
            self.assertEqual(source["access"], "free")
            self.assertTrue(source["can_prove_dimensions"])
            self.assertIn(source["source_type"], allowed_types)
            self.assertTrue(source["url"].startswith("https://"))
            self.assertTrue(source["models"])
            self.assertTrue(source["model_years"])
            self.assertTrue(source["dimension_content"])
            self.assertTrue(source["document_location"])

    def test_catalog_excludes_non_dimensional_source_classes(self):
        text = SOURCE_CATALOG_PATH.read_text().casefold()
        self.assertNotIn('"source_type": "parts_diagram"', text)
        self.assertNotIn('"source_type": "vehicle_identity"', text)
        self.assertNotIn('"can_prove_dimensions": false', text)
        self.assertNotIn("parts.toyota.com", text)
        self.assertNotIn("vpic.nhtsa.dot.gov", text)

    def test_vehicle_filter_requires_make_model_and_year_match(self):
        tesla_2022 = sources_for_vehicle({"make": "Tesla", "model": "Model 3", "year": "2022"})
        self.assertEqual({source["id"] for source in tesla_2022}, {"tesla-model-3-2017-2023-dimensional-specifications"})
        tesla_2024 = sources_for_vehicle({"make": "Tesla", "model": "Model 3", "year": "2024"})
        self.assertEqual({source["id"] for source in tesla_2024}, {"tesla-model-3-2024-dimensional-specifications"})
        self.assertEqual(sources_for_vehicle({"make": "Toyota", "model": "Camry", "year": "2021"}), [])

    def test_astra_prompt_uses_exact_documents_before_general_search(self):
        request = build_openai_request({
            "phase": "research_and_generate",
            "image_base64": "Zml4dHVyZQ==",
            "user_text": "Broken bracket beside the left headlamp.",
            "confirmed_vehicle": {"make": "Chevrolet", "model": "City Express", "year": "2017"},
        })
        prompt = request["input"][0]["content"][0]["text"]
        self.assertIn("2015-18-CHEVROLET-CITY-EXPRESS-CARGO-VAN_BBM_V1.pdf", prompt)
        self.assertNotIn("parts.gmparts.com", prompt)
        self.assertIn("Search the pre-indexed dimensional documents before general web search", prompt)
        self.assertIn("Never infer dimensions, hole positions, tolerances, or scale", prompt)
        self.assertIn("Broken bracket beside the left headlamp.", prompt)


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("source catalog checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
