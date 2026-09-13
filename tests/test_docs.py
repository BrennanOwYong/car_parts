#!/usr/bin/env python3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DeviceDocumentationChecks(unittest.TestCase):
    def test_macbook_and_iphone_pairing_is_documented(self):
        readme = (ROOT / "README.md").read_text()
        for value in (
            "MacBook and iPhone setup",
            "Developer Mode",
            "Devices and Simulators",
            "Connect via network",
            "ASTRA_RELAY_URL",
            "Use scan for CAD",
            "LiDAR scene reconstruction does not run in the iOS Simulator",
        ):
            self.assertIn(value, readme)

    def test_windows_handoff_and_secret_rules_are_documented(self):
        readme = (ROOT / "README.md").read_text()
        self.assertIn("Windows and MacBook collaboration", readme)
        self.assertIn("git pull --ff-only", readme)
        self.assertIn("Do not put the API key in the iOS project", readme)


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("device documentation checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
