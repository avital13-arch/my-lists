import json
import os
import threading

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')
_lock = threading.Lock()

_DEFAULTS = {'checklist': [], 'places': [], 'links': [], 'trip': None}


def load():
    with _lock:
        if not os.path.exists(DATA_FILE):
            return dict(_DEFAULTS)
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            for k, v in _DEFAULTS.items():
                data.setdefault(k, v)
            return data
        except Exception:
            return dict(_DEFAULTS)


def save(data):
    with _lock:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
