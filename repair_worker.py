"""One bounded local request from FORMA; credentials stay in the Python process."""
import json
import os
import sys
from astra_relay import call_openai

if __name__ == "__main__":
    try:
        if "--status" in sys.argv:
            value = {"status": 200, "result": {"configured": bool(os.environ.get("OPENAI_API_KEY"))}}
        else:
            raw = sys.stdin.buffer.read(20_000_001)
            if len(raw) > 20_000_000:
                raise ValueError("Request too large.")
            payload = json.loads(raw)
            if not isinstance(payload, dict) or payload.get("phase") not in {"repair_chat", "repair_chat_generate"}:
                raise ValueError("Invalid repair conversation request.")
            value = {"status": 200, "result": call_openai(payload)}
    except Exception as error:
        # Do not return authentication headers, subprocess tracebacks or service response bodies.
        from urllib.error import HTTPError, URLError
        if isinstance(error, HTTPError):
            message = f"Astra service returned HTTP {error.code}. Check the configured key, model access and account limits."
        elif isinstance(error, URLError):
            message = "Astra could not be reached. Your photos and selections are still here; try again."
        elif isinstance(error, (ValueError, RuntimeError)):
            message = str(error)
        else:
            message = "Astra could not complete this request. Try again."
        value = {"status": 400 if isinstance(error, ValueError) else 503, "result": {"error": message}}
    sys.stdout.write(json.dumps(value))
