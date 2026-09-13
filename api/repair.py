"""Vercel repair adapter. Reuses the existing validated Astra conversation.

Official references checked 2026-09-13:
https://vercel.com/docs/functions/runtimes/python/api-directory
https://vercel.com/docs/functions/limitations
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from astra_relay import call_openai
from repair_chat import request_context

MAX_BODY = 4_000_000


class handler(BaseHTTPRequestHandler):
    def reply(self, status, value):
        data = json.dumps(value).encode('utf-8')
        if len(data) > MAX_BODY:
            status = 503
            data = json.dumps({'error': 'The generated concepts are too large. Confirm fewer parts and retry.'}).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)

    def action(self):
        url = urlsplit(self.path)
        return parse_qs(url.query).get('action', [url.path.rsplit('/', 1)[-1]])[0]

    def do_GET(self):
        if self.action() != 'status':
            return self.reply(404, {'error': 'Endpoint not found.'})
        self.reply(200, {'configured': bool(os.environ.get('OPENAI_API_KEY')), 'maxRequestBytes': MAX_BODY})

    def do_POST(self):
        if self.action() != 'chat':
            return self.reply(404, {'error': 'Endpoint not found.'})
        origin = self.headers.get('Origin')
        host = self.headers.get('Host', '')
        if origin and origin != f'https://{host}':
            return self.reply(403, {'error': 'Send photos from this FORMA site.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BODY:
                if MAX_BODY < size <= 4_500_000:
                    self.rfile.read(size)
                return self.reply(413, {'error': 'Photos exceed the request limit. Remove a photo and retry.'})
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict) or payload.get('phase') not in {'repair_chat', 'repair_chat_generate'}:
                raise ValueError('Invalid repair phase.')
            try:
                request_context(payload)
            except ValueError as error:
                return self.reply(400, {'error': str(error)})
            if not os.environ.get('OPENAI_API_KEY'):
                return self.reply(503, {'error': 'Live Astra review is not configured for this public demo.'})
            self.reply(200, call_openai(payload))
        except (ValueError, UnicodeError):
            self.reply(400, {'error': 'Invalid repair request. Check the vehicle, photos and selected parts.'})
        except HTTPError as error:
            self.reply(503, {'error': f'Astra service returned HTTP {error.code}. Please try again later.'})
        except (URLError, TimeoutError):
            self.reply(503, {'error': 'Astra could not be reached. Your photos and selections are preserved; retry.'})
        except Exception:
            self.reply(503, {'error': 'Astra could not complete this request. Please retry.'})

    def log_message(self, format, *args):
        # Keep photo contents and service credentials out of request logs.
        pass
