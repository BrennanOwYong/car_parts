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

    def test_relay_serves_desktop_upload_website(self):
        self.assertEqual(SERVER_HOST, "localhost")
        response, html = self.get("/")
        self.assertEqual(response.headers.get_content_type(), "text/html")
        for value in ("part-photo", "part-notes", "vehicle-panel", "measure-panel", "cad-panel", "download-button", "exploded-download-button"):
            self.assertIn(f'id="{value}"', html)
        self.assertIn("Upload or paste a car photo", html)
        self.assertIn("press Ctrl+V to paste one", html)
        self.assertIn("Dimension-bearing official documents pre-indexed", html)
        self.assertIn("<textarea", html)
        self.assertEqual(html.count('type="file"'), 1)

    def test_website_has_no_mobile_capture_or_lidar_interface(self):
        _, html = self.get("/")
        _, script = self.get("/app.js")
        combined = html + script
        for value in ('capture="environment"', "getUserMedia", "<video", "LiDAR", "iPhone", "detectDepthCapability", "scan_obj_base64"):
            self.assertNotIn(value, combined)

    def test_script_uses_same_origin_api_and_optional_text(self):
        response, script = self.get("/app.js")
        self.assertEqual(response.headers.get_content_type(), "text/javascript")
        self.assertIn('fetch("/analyze"', script)
        self.assertIn('user_text: element("part-notes").value.trim()', script)
        self.assertIn('result.outcome === "needs_dimensions"', script)
        self.assertIn('document.addEventListener("paste"', script)

    def test_vehicle_confirmation_and_cad_downloads_exist(self):
        _, html = self.get("/")
        _, script = self.get("/app.js")
        for value in ("vehicle-make", "vehicle-model", "vehicle-year"):
            self.assertIn(f'id="{value}"', html)
        self.assertIn('link.download = `${state.partName', script)
        self.assertIn('-exploded.scad`', script)

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
