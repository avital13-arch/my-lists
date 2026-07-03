// ── Trip Planner Module ───────────────────────────
window._initTrip = function () {
  'use strict';
  let trip = JSON.parse(localStorage.getItem('checklist-trip') || 'null');

  const setupDiv     = document.getElementById('trip-setup');
  const calendarDiv  = document.getElementById('trip-calendar');
  const form         = document.getElementById('trip-form');
  const nameInput    = document.getElementById('trip-name');
  const cityInput    = document.getElementById('trip-city');
  const startInput   = document.getElementById('trip-start');
  const endInput     = document.getElementById('trip-end');
  const submitBtn    = document.getElementById('trip-submit-btn');
  const errorEl      = document.getElementById('trip-error');
  const titleEl      = document.getElementById('trip-title');
  const subtitleEl   = document.getElementById('trip-subtitle');
  const weatherErrEl = document.getElementById('trip-weather-error');
  const daysDiv      = document.getElementById('trip-days');
  const editBtn      = document.getElementById('trip-edit-btn');

  // WMO weather code → [emoji, description]
  const WMO = {
    0:  ['☀️',  'Clear sky'],
    1:  ['🌤️', 'Mainly clear'],
    2:  ['⛅',  'Partly cloudy'],
    3:  ['☁️',  'Overcast'],
    45: ['🌫️', 'Fog'],
    48: ['🌫️', 'Icy fog'],
    51: ['🌦️', 'Light drizzle'],
    53: ['🌦️', 'Drizzle'],
    55: ['🌦️', 'Dense drizzle'],
    61: ['🌧️', 'Slight rain'],
    63: ['🌧️', 'Rain'],
    65: ['🌧️', 'Heavy rain'],
    71: ['❄️',  'Slight snow'],
    73: ['❄️',  'Snow'],
    75: ['❄️',  'Heavy snow'],
    77: ['❄️',  'Snow grains'],
    80: ['🌧️', 'Slight showers'],
    81: ['🌧️', 'Showers'],
    82: ['🌧️', 'Heavy showers'],
    85: ['🌨️', 'Snow showers'],
    86: ['🌨️', 'Heavy snow showers'],
    95: ['⛈️',  'Thunderstorm'],
    96: ['⛈️',  'Thunderstorm + hail'],
    99: ['⛈️',  'Thunderstorm + hail'],
  };

  function save() { localStorage.setItem('checklist-trip', JSON.stringify(trip)); }

  // ── Date helpers ───────────────────────────────
  function getDates(start, end) {
    const dates = [];
    let cur  = new Date(start + 'T00:00:00');
    const last = new Date(end   + 'T00:00:00');
    while (cur <= last) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  function fmtShort(d) {
    return new Date(d + 'T00:00:00')
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtFull(d) {
    return new Date(d + 'T00:00:00')
      .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ── Show / hide ────────────────────────────────
  function showSetup() {
    setupDiv.removeAttribute('hidden');
    calendarDiv.setAttribute('hidden', '');
    errorEl.textContent = '';
    if (trip) {
      nameInput.value  = trip.name      || '';
      cityInput.value  = trip.city      || '';
      startInput.value = trip.startDate || '';
      endInput.value   = trip.endDate   || '';
    }
  }

  function showCalendar() {
    setupDiv.setAttribute('hidden', '');
    calendarDiv.removeAttribute('hidden');
    renderCalendar();
  }

  // ── Calendar render ────────────────────────────
  function renderCalendar() {
    titleEl.textContent    = trip.name;
    subtitleEl.textContent =
      `${fmtShort(trip.startDate)} → ${fmtShort(trip.endDate)}  ·  ${trip.city}`;
    weatherErrEl.textContent = '';
    daysDiv.innerHTML = '';
    getDates(trip.startDate, trip.endDate).forEach(d => daysDiv.appendChild(makeDayCard(d)));
  }

  function makeDayCard(dateStr) {
    const activities = (trip.days && trip.days[dateStr]) || [];
    const w = trip.weather && trip.weather[dateStr];

    const card = document.createElement('div');
    card.className = 'trip-day';
    card.id = `day-${dateStr}`;

    // Header: date label + weather badge
    const hdr = document.createElement('div');
    hdr.className = 'trip-day-header';

    const dateLbl = document.createElement('span');
    dateLbl.className = 'trip-day-date';
    dateLbl.textContent = fmtFull(dateStr);

    const badge = document.createElement('span');
    if (w && w.code !== null && w.code !== undefined) {
      const [emoji, desc] = WMO[w.code] || ['🌡️', 'Unknown'];
      badge.className   = 'weather-badge';
      badge.textContent = `${emoji} ${w.max ?? '?'}°/${w.min ?? '?'}°`;
      badge.title       = desc;
    } else {
      badge.className   = 'weather-badge weather-badge--unavailable';
      badge.textContent = '—';
      badge.title       = 'Forecast unavailable for this date';
    }
    hdr.append(dateLbl, badge);

    // Activity list
    const ul = document.createElement('ul');
    ul.className = 'activity-list';
    activities.forEach(act => ul.appendChild(makeActivityRow(dateStr, act)));

    // Add-activity bar
    const addBar = document.createElement('div');
    addBar.className = 'add-activity-bar';
    const actIn  = document.createElement('input');
    actIn.type = 'text'; actIn.placeholder = 'Add activity…'; actIn.maxLength = 200;
    const actBtn = document.createElement('button');
    actBtn.textContent = 'Add';

    function doAdd() {
      const text = actIn.value.trim();
      if (!text) { actIn.focus(); return; }
      if (!trip.days) trip.days = {};
      if (!trip.days[dateStr]) trip.days[dateStr] = [];
      trip.days[dateStr].push({ id: crypto.randomUUID(), text });
      save();
      card.replaceWith(makeDayCard(dateStr));
      document.querySelector(`#day-${dateStr} .add-activity-bar input`)?.focus();
    }

    actBtn.addEventListener('click', doAdd);
    actIn.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
    addBar.append(actIn, actBtn);

    card.append(hdr, ul, addBar);
    return card;
  }

  function makeActivityRow(dateStr, act) {
    const li = document.createElement('li');
    li.className = 'activity-row';
    const span = document.createElement('span');
    span.textContent = act.text;
    const del = iconBtn('🗑️', 'Delete', 'delete', () => {
      trip.days[dateStr] = (trip.days[dateStr] || []).filter(a => a.id !== act.id);
      save();
      const old = document.getElementById(`day-${dateStr}`);
      if (old) old.replaceWith(makeDayCard(dateStr));
    });
    li.append(span, del);
    return li;
  }

  // ── Direct weather fetch (browser → Open-Meteo) ─
  async function fetchWeatherDirect(city, startDate, endDate) {
    try {
      const geoResp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      if (!geoResp.ok) throw new Error('Geocoding request failed');
      const results = (await geoResp.json()).results;
      if (!results?.length) return { error: `City "${city}" not found — try a different spelling.` };

      const lat = results[0].latitude;
      const lon = results[0].longitude;

      const today    = new Date().toISOString().slice(0, 10);
      const maxDate  = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
      const fetchStart = startDate > today   ? startDate : today;
      const fetchEnd   = endDate   < maxDate ? endDate   : maxDate;

      if (fetchStart > fetchEnd) return { lat, lon, weather: {} };

      const fcResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto` +
        `&start_date=${fetchStart}&end_date=${fetchEnd}`
      );
      if (!fcResp.ok) throw new Error('Forecast request failed');
      const daily = (await fcResp.json()).daily || {};
      const dates = daily.time || [];
      const maxT  = daily.temperature_2m_max || [];
      const minT  = daily.temperature_2m_min || [];
      const codes = daily.weathercode || [];

      const weather = {};
      dates.forEach((d, i) => {
        weather[d] = {
          max:  maxT[i]  != null ? Math.round(maxT[i])  : null,
          min:  minT[i]  != null ? Math.round(minT[i])  : null,
          code: codes[i] != null ? codes[i]              : null,
        };
      });
      return { lat, lon, weather };
    } catch (err) {
      return { error: err.message };
    }
  }

  // ── Form submit ────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    errorEl.textContent = '';

    const name  = nameInput.value.trim();
    const city  = cityInput.value.trim();
    const start = startInput.value;
    const end   = endInput.value;

    if (!name || !city || !start || !end) {
      errorEl.textContent = 'Please fill in all fields.'; return;
    }
    if (start > end) {
      errorEl.textContent = 'Start date must be on or before end date.'; return;
    }
    if (getDates(start, end).length > 30) {
      errorEl.textContent = 'Trip cannot be longer than 30 days.'; return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Fetching weather…';

    const existingDays = (trip && trip.days) || {};
    trip = { name, city, lat: null, lon: null, startDate: start, endDate: end, days: existingDays, weather: {} };
    save();
    showCalendar();

    try {
      const res = await fetchWeatherDirect(city, start, end);
      if (res.error) {
        weatherErrEl.textContent = `⚠ Weather unavailable: ${res.error}`;
      } else {
        trip.lat     = res.lat;
        trip.lon     = res.lon;
        trip.weather = res.weather || {};
        save();
        renderCalendar();
      }
    } catch (_) {
      weatherErrEl.textContent = '⚠ Could not fetch weather forecast.';
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Plan Trip →';
    }
  }

  form.addEventListener('submit', handleSubmit);
  editBtn.addEventListener('click', showSetup);

  if (trip) showCalendar(); else showSetup();
};
