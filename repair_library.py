"""Saved visual surfaces; no model-generated mounting coordinates."""
import hashlib
import json
import os
from repair_chat import ROOT, request_context


def saved_repair_parts(payload):
    _, manifest, _, _, selected = request_context(payload)
    if not selected or any(p['side'] == 'unknown' or not p['assemblyIds'] for p in selected):
        raise ValueError('Select mapped parts with a known side before retrieving saved parts.')
    base = ROOT / 'repair-runtime-assets' if os.environ.get('VERCEL') == '1' else ROOT / 'design_mod/public/repair-assets'
    folder = base / manifest['vehicleId']
    file = folder / 'repair-library.json'
    if not file.is_file():
        raise ValueError('This vehicle has no saved repair parts yet.')
    library = json.loads(file.read_text(encoding='utf-8'))
    if library.get('vehicleAssetId') != manifest['vehicleId'] or library.get('sourceHash') != manifest.get('outputHash') or hashlib.sha256((folder / 'vehicle.glb').read_bytes()).hexdigest() != library['sourceHash']:
        raise ValueError('Saved parts must be rebuilt for the current vehicle geometry.')
    available = {p['id']: p for p in library['parts']}
    if any(p['id'] not in available for p in selected):
        raise ValueError('A selected part is not in the saved library.')
    return {'outcome':'repair_cad_ready', 'vehicleAssetId':manifest['vehicleId'],
            'userMessage':'Your saved Corolla 2020 parts are ready. Open a reference diagram or download the fitted and exploded versions below.',
            'repairCad':[available[p['id']] for p in selected]}
