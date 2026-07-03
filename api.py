import webbrowser
from datetime import date, timedelta

import data as _data

try:
    import requests as _requests
    _HAS_REQUESTS = True
except ImportError:
    _HAS_REQUESTS = False


class Api:

    def get_all(self):
        return _data.load()

    def save_checklist(self, items):
        d = _data.load()
        d['checklist'] = items
        _data.save(d)

    def save_places(self, places):
        d = _data.load()
        d['places'] = places
        _data.save(d)

    def save_links(self, links):
        d = _data.load()
        d['links'] = links
        _data.save(d)

    def save_trip(self, trip):
        d = _data.load()
        d['trip'] = trip
        _data.save(d)

    def open_url(self, url):
        webbrowser.open_new_tab(url)
        return True

    def fetch_weather(self, city, start_date, end_date):
        if not _HAS_REQUESTS:
            return {'error': 'requests library not installed'}
        try:
            geo = _requests.get(
                'https://geocoding-api.open-meteo.com/v1/search',
                params={'name': city, 'count': 1, 'language': 'en', 'format': 'json'},
                timeout=8,
            )
            geo.raise_for_status()
            results = geo.json().get('results')
            if not results:
                return {'error': f'City "{city}" not found — try a different spelling.'}

            lat = results[0]['latitude']
            lon = results[0]['longitude']

            today     = date.today()
            max_date  = today + timedelta(days=6)
            req_start = date.fromisoformat(start_date)
            req_end   = date.fromisoformat(end_date)

            fetch_start = max(req_start, today)
            fetch_end   = min(req_end,   max_date)

            if fetch_start > fetch_end:
                return {'lat': lat, 'lon': lon, 'weather': {}}

            fc = _requests.get(
                'https://api.open-meteo.com/v1/forecast',
                params={
                    'latitude':  lat,
                    'longitude': lon,
                    'daily':     'temperature_2m_max,temperature_2m_min,weathercode',
                    'timezone':  'auto',
                    'start_date': fetch_start.isoformat(),
                    'end_date':   fetch_end.isoformat(),
                },
                timeout=8,
            )
            fc.raise_for_status()
            daily = fc.json().get('daily', {})

            dates  = daily.get('time', [])
            max_t  = daily.get('temperature_2m_max', [])
            min_t  = daily.get('temperature_2m_min', [])
            codes  = daily.get('weathercode', [])

            weather = {}
            for i, d in enumerate(dates):
                weather[d] = {
                    'max':  round(max_t[i]) if i < len(max_t) and max_t[i] is not None else None,
                    'min':  round(min_t[i]) if i < len(min_t) and min_t[i] is not None else None,
                    'code': codes[i]        if i < len(codes)                           else None,
                }
            return {'lat': lat, 'lon': lon, 'weather': weather}

        except Exception as e:
            return {'error': str(e)}
