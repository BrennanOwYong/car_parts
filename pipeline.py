#!/usr/bin/env python3
"""Evidence-first car-part reconstruction decision engine.

This module does not invent CAD dimensions. It turns supplied evidence into
explicit constraints and decides whether a CAD candidate can be released.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


HARD_FEATURES = {"mounting_hole", "locating_pin", "sealing_face", "interface_plane", "clearance"}
ALLOWED_SOURCES = {"oem", "inferred", "unknown"}


@dataclass(frozen=True)
class Constraint:
    feature: str
    source: str
    value: Any
    tolerance_mm: float | None
    confidence: float
    hard: bool
    evidence_id: str | None


def _constraint(raw: dict[str, Any]) -> Constraint:
    feature = str(raw["feature"])
    source = str(raw.get("source", "unknown"))
    if source not in ALLOWED_SOURCES:
        raise ValueError(f"unsupported source: {source}")
    confidence = float(raw.get("confidence", 0.0))
    if not 0 <= confidence <= 1:
        raise ValueError("confidence must be between 0 and 1")
    tolerance = raw.get("tolerance_mm")
    return Constraint(feature, source, raw.get("value"), None if tolerance is None else float(tolerance), confidence, feature in HARD_FEATURES or bool(raw.get("hard")), raw.get("evidence_id"))


def assess(job: dict[str, Any]) -> dict[str, Any]:
    """Assess whether a reconstruction job has enough evidence for CAD release."""
    if not job.get("vehicle", {}).get("vin") and not job.get("vehicle", {}).get("make_model_year"):
        raise ValueError("vehicle VIN or make_model_year is required")
    constraints = [_constraint(c) for c in job.get("constraints", [])]
    failures: list[str] = []
    for c in constraints:
        if c.hard and c.source in {"unknown", "inferred"}:
            failures.append(f"{c.feature}: hard constraint is not measured or OEM-verified")
        if c.hard and c.confidence < 0.95:
            failures.append(f"{c.feature}: confidence {c.confidence:.2f} is below 0.95")
        if c.hard and not c.evidence_id:
            failures.append(f"{c.feature}: evidence_id is required")

    hard_features = {c.feature for c in constraints if c.hard}
    required_features = set(job.get("required_features", ["mounting_hole"]))
    missing = sorted(required_features - hard_features)
    failures.extend(f"{feature}: required interface feature is missing" for feature in missing)
    status = "blocked" if failures else "candidate_ready"
    return {
        "status": status,
        "vehicle": job["vehicle"],
        "part": job.get("part", {}),
        "constraints": [asdict(c) for c in constraints],
        "failures": failures,
        "next_actions": (["obtain an exact OEM dimension", "record its tolerance and evidence ID", "review generated CAD before manufacture"] if failures else ["generate CAD from the constraint set", "run interference and tolerance checks", "require human sign-off before manufacture"]),
    }


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f"usage: {argv[0]} JOB.json", file=sys.stderr)
        return 2
    try:
        result = assess(json.loads(Path(argv[1]).read_text()))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"input error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "candidate_ready" else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
