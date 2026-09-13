#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import assess  # noqa: E402


class PipelineChecks(unittest.TestCase):
    def test_unmeasured_mount_is_blocked(self):
        result = assess({"vehicle": {"make_model_year": "Example 2020"}, "part": {"name": "bracket"}, "constraints": []})
        self.assertEqual(result["status"], "blocked")
        self.assertTrue(any("mounting_hole" in failure for failure in result["failures"]))

    def test_measured_interfaces_are_candidate_ready(self):
        job = {"vehicle": {"vin": "1TESTVIN"}, "part": {"name": "bracket"}, "constraints": [
            {"feature": "mounting_hole", "source": "measured_scan", "value": {"diameter_mm": 6, "center": [10, 20, 0]}, "tolerance_mm": 0.2, "confidence": 0.98, "evidence_id": "scan-1"},
            {"feature": "locating_pin", "source": "oem", "value": {"center": [2, 3, 0]}, "tolerance_mm": 0.1, "confidence": 0.99, "evidence_id": "oem-1"},
        ]}
        self.assertEqual(assess(job)["status"], "candidate_ready")

    def test_cli_returns_json_and_nonzero_for_blocked_job(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump({"vehicle": {"make_model_year": "Example 2020"}, "constraints": []}, f)
            f.flush()
            run = subprocess.run([sys.executable, str(ROOT / "pipeline.py"), f.name], capture_output=True, text=True)
        self.assertEqual(run.returncode, 1)
        self.assertEqual(json.loads(run.stdout)["status"], "blocked")


if __name__ == "__main__":
    result = unittest.main(exit=False)
    if result.result.wasSuccessful():
        print("all pipeline checks passed")
        raise SystemExit(0)
    raise SystemExit(1)
