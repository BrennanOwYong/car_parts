#!/usr/bin/env python3
import threading
import sys
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from astra_relay import Handler, SERVER_HOST  # noqa: E402


class WebApplicationChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer((SERVER_HOST, 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://{SERVER_HOST}:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def get(self, path):
        with urllib.request.urlopen(self.base + path) as response:
            return response, response.read().decode()

    def test_relay_serves_conversational_website(self):
        self.assertEqual(SERVER_HOST, "localhost")
        response, html = self.get("/")
        self.assertEqual(response.headers.get_content_type(), "text/html")
        for value in (
            "chat-log", "part-photo", "photo-preview", "message-input", "send-button",
            "page-title", "cad-panel", "output-title", "cad-summary", "dimensions-list",
            "assumptions-list", "sources-list", "download-actions", "download-button",
            "exploded-download-button",
        ):
            self.assertIn(f'id="{value}"', html)
        self.assertIn('role="log"', html)
        self.assertIn("Upload or paste a car photo", html)
        self.assertIn("Show the car. Choose the part.", html)
        self.assertIn("ROUGH VISUAL CONCEPT - NOT FOR FABRICATION", html)

    def test_layout_matches_supplied_sketch_structure(self):
        _, html = self.get("/")
        for value in ('class="workbench"', 'class="photo-pane"', 'class="conversation-pane"', 'class="composer"'):
            self.assertIn(value, html)
        self.assertLess(html.index('class="photo-pane"'), html.index('class="conversation-pane"'))
        self.assertLess(html.index('class="conversation-pane"'), html.index('class="composer"'))
        _, css = self.get("/styles.css")
        self.assertIn("grid-template-columns: minmax(0, 1.55fr) minmax(360px, 1fr)", css)
        self.assertIn(".composer { grid-column: 1 / -1", css)
        self.assertIn(".photo-pane { display: flex", css)

    def test_website_has_no_vehicle_or_part_form(self):
        _, html = self.get("/")
        for value in ("vehicle-make", "vehicle-model", "vehicle-year", "target-part", "<form", "<select"):
            self.assertNotIn(value, html)
        self.assertEqual(html.count("<textarea"), 1)
        self.assertEqual(html.count('type="file"'), 1)
        self.assertNotIn('accept="video/', html)

    def test_script_runs_identify_then_conversational_confirmation(self):
        response, script = self.get("/app.js")
        self.assertEqual(response.headers.get_content_type(), "text/javascript")
        for value in (
            'fetch("/analyze"', 'phase: "identify"', 'phase: "research_and_generate"',
            "candidate_vehicle: state.candidate.vehicle", "candidate_part: state.candidate.partType",
            "confirmation_text: reply", 'appendMessage("assistant"',
        ):
            self.assertIn(value, script)

    def test_script_renders_sources_estimates_and_assumptions(self):
        _, script = self.get("/app.js")
        for value in ("dimensionEvidence", "assumptions", "sources", "sourceType", "public scan", "cad-summary", "rough_cad_ready"):
            self.assertIn(value, script)

    def test_script_handles_lidar_without_false_cad_downloads(self):
        _, script = self.get("/app.js")
        for value in (
            'result.outcome === "needs_lidar"', "result.userMessage",
            "A LiDAR scan is the next input before I create the CAD concept.",
            'element("download-actions").hidden = true',
            "No CAD file was generated",
        ):
            self.assertIn(value, script)
        self.assertIn('result.outcome === "needs_lidar" && !result.cadPayload && !result.explodedCadPayload', script)

    def test_selected_and_pasted_images_share_one_processing_path(self):
        _, script = self.get("/app.js")
        self.assertGreaterEqual(script.count("await useImage(file)"), 2)
        self.assertIn('document.addEventListener("paste"', script)
        self.assertNotIn("getUserMedia", script)
        self.assertNotIn("<video", script)
        use_image = script[script.index("async function useImage"):script.index("function bytesToBase64")]
        self.assertNotIn("identifyPhoto", use_image)
        self.assertNotIn("postAstra", use_image)
        self.assertIn('addEventListener("input", updateSendButton)', script)
        self.assertIn("Type what you want Astra to do before sending.", script)
        self.assertIn('input.placeholder = "Reply naturally.', script)
        self.assertIn('new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])', script)

    def test_cad_downloads_include_exploded_file(self):
        _, script = self.get("/app.js")
        self.assertIn('${suffix}.scad`', script)
        self.assertIn('downloadCad(state.explodedCad, "-exploded")', script)

    def test_repair_review_has_confirmation_carousel_and_damage_to_cad_map(self):
        _, html = self.get("/")
        for value in ("damage-map", "repair-review", "damage-carousel", "generate-repair-button", "repair-downloads", "reference-model"):
            self.assertIn(f'id="{value}"', html)
        _, script = self.get("/app.js")
        for value in ('phase: "damage_assessment"', 'phase: "repair_generate"', "renderDamageMap", "imageAnchor", "isRepairRequest"):
            self.assertIn(value, script)

    def test_static_routes_are_restricted(self):
        with self.assertRaises(urllib.error.HTTPError) as caught:
            self.get("/../astra_relay.py")
        self.assertEqual(caught.exception.code, 404)

    def test_health_endpoint(self):
        response, body = self.get("/health")
        self.assertEqual(response.headers.get_content_type(), "application/json")
        self.assertEqual(body, '{"status":"ok"}')


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("web application checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
