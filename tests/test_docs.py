#!/usr/bin/env python3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DesktopDocumentationChecks(unittest.TestCase):
    def test_hackathon_scope_and_flow_are_documented(self):
        readme = (ROOT / "README.md").read_text()
        for value in (
            "Hackathon scope", "hood", "front bumper cover", "front fender",
            "wheel-arch trim", "side-mirror housing", "rough visual concept",
            "fitted and exploded-view OpenSCAD files", "Ctrl+V",
        ):
            self.assertIn(value, readme)

    def test_desktop_run_steps_are_documented(self):
        readme = (ROOT / "README.md").read_text()
        for value in ("Run on a desktop computer", "macOS, Linux, or WSL", "Windows PowerShell", "OPENAI_API_KEY", ".env.example", "http://localhost:8787"):
            self.assertIn(value, readme)

    def test_private_env_file_is_ignored(self):
        gitignore = (ROOT / ".gitignore").read_text().splitlines()
        self.assertIn(".env", gitignore)
        self.assertTrue((ROOT / ".env.example").is_file())

    def test_server_is_documented_as_localhost_only(self):
        readme = (ROOT / "README.md").read_text()
        self.assertIn("binds only to `localhost`", readme)
        self.assertNotIn("0.0.0.0", readme)

    def test_concept_limit_is_clear(self):
        readme = (ROOT / "README.md").read_text()
        for value in ("not suitable for fabrication", "does not guarantee fit", "sourced", "estimated"):
            self.assertIn(value, readme)

    def test_oem_public_scan_lidar_order_is_documented(self):
        readme = (ROOT / "README.md").read_text()
        oem = readme.index("checks the pre-indexed official dimension documents")
        public_scan = readme.index("searches the web for a public 3D scan")
        lidar = readme.index("asks the user to make a LiDAR scan")
        self.assertLess(oem, public_scan)
        self.assertLess(public_scan, lidar)

    def test_public_scan_provenance_and_rights_are_documented(self):
        readme = (ROOT / "README.md").read_text()
        for value in (
            "title, URL, creator and platform", "sourceType=public_scan",
            "Public access does not grant permission", "not an OEM or certified source",
        ):
            self.assertIn(value, readme)

    def test_current_lidar_boundary_is_documented(self):
        readme = (ROOT / "README.md").read_text()
        self.assertIn("This desktop MVP accepts only images and text", readme)
        self.assertIn("does not ingest a LiDAR mesh", readme)


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("desktop documentation checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
