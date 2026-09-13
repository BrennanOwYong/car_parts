#!/usr/bin/env python3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DesktopDocumentationChecks(unittest.TestCase):
    def test_desktop_run_steps_are_documented(self):
        readme = (ROOT / "README.md").read_text()
        for value in ("Run on a desktop computer", "macOS or Linux", "Windows PowerShell", "OPENAI_API_KEY", "python3 astra_relay.py", "http://localhost:8787", "Upload car photo"):
            self.assertIn(value, readme)

    def test_mobile_and_camera_setup_are_removed(self):
        readme = (ROOT / "README.md").read_text()
        for value in ("Cloudflare Quick Tunnel", "share_mobile.py", "Developer Mode", "Devices and Simulators", "ASTRA_RELAY_URL", "LiDAR", "iPhone"):
            self.assertNotIn(value, readme)
        self.assertIn("It does not request a camera", readme)

    def test_evidence_limit_and_both_outputs_are_documented(self):
        readme = (ROOT / "README.md").read_text()
        self.assertIn("fitted and exploded-view OpenSCAD files", readme)
        self.assertIn("lists the missing dimensions", readme)
        self.assertIn("does not treat a photograph", readme)


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("desktop documentation checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
