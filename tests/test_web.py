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
from astra_relay import Handler  # noqa: E402


class WebApplicationChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def get(self, path):
        with urllib.request.urlopen(self.base + path) as response:
            return response, response.read().decode()

    def test_relay_serves_mobile_website(self):
        response, html = self.get("/")
        self.assertEqual(response.headers.get_content_type(), "text/html")
        for value in ("part-photo", "vehicle-panel", "measure-panel", "cad-panel", "download-button"):
            self.assertIn(f'id="{value}"', html)
        self.assertIn('capture="environment"', html)
        self.assertIn("Take car-part photo", html)
        self.assertIn("It does not record video", html)
        self.assertNotIn("<video", html)

    def test_scripts_use_same_origin_api_and_honest_lidar_check(self):
        response, script = self.get("/app.js")
        self.assertEqual(response.headers.get_content_type(), "text/javascript")
        self.assertIn('fetch("/analyze"', script)
        self.assertIn("detectDepthCapability", script)
        self.assertIn("Safari does not identify the iPhone model or provide its raw ARKit mesh", script)
        self.assertIn("scan_obj_base64", script)

    def test_camera_flow_is_photo_only(self):
        _, script = self.get("/app.js")
        self.assertIn('canvas.toBlob(resolve, "image/jpeg"', script)
        self.assertIn("imageAsJpegBase64(file)", script)
        self.assertNotIn("getUserMedia", script)
        self.assertNotIn("cameraStream", script)

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
