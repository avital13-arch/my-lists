// ── Trip Planner Module (Multi-Place) ─────────────────────────
window._initTrip = function () {
  'use strict';
  let trip = JSON.parse(localStorage.getItem('checklist-trip') || 'null');
  
  // Migrate old single-place format to new multi-place format
  if (trip && !trip.places && trip.city) {
    trip = {
      name: trip.name || 'My Trip',
      places: [{
        id: crypto.randomUUID(),
        city: trip.city,
        startDate: trip.startDate,
        endDate: trip.endDate,
        lat: trip.lat || null,
        lon: trip.lon || null,
        weather: trip.weather || {},
        days: trip.days || {}
      }]
    };
  }

  const setupDiv     = document.getElementById('trip-setup');
  const calendarDiv  = document.getElementById('trip-calendar');
  const form         = document.getElementById('trip-form');
  const nameInput    = document.getElementById('trip-name');
  const placesContainer = document.getElementById('places-container');
  const submitBtn    = document.getElementById('trip-submit-btn');
  const addPlaceBtn  = document.getElementById('trip-add-place-btn');
  const errorEl      = document.getElementById('trip-error');
  const titleEl      = document.getElementById('trip-title');
  const subtitleEl   = document.getElementById('trip-subtitle');
  const weatherErrEl = document.getElementById('trip-weather-error');
  const placesSection = document.getElementById('trip-places-section');
  const editBtn        = document.getElementById('trip-edit-btn');
  const clearSetupBtn  = document.getElementById('trip-clear-setup-btn');
  const clearCalBtn    = document.getElementById('trip-clear-cal-btn');
  const clearModal     = document.getElementById('trip-clear-modal');
  const modalPlaceSel  = document.getElementById('modal-place-select');
  const modalDaySel    = document.getElementById('modal-day-select');
  const modalConfirmMsg = document.getElementById('modal-confirm-msg');
  const modalClearBtn  = document.getElementById('modal-clear-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

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
  function localDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getDates(start, end) {
    const dates = [];
    let cur  = new Date(start + 'T00:00:00');
    const last = new Date(end   + 'T00:00:00');
    while (cur <= last) {
      dates.push(localDateStr(cur));
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
    renderSetupForm();
    if (trip && trip.places && trip.places.length > 0) {
      clearSetupBtn.removeAttribute('hidden');
    } else {
      clearSetupBtn.setAttribute('hidden', '');
    }
  }

  function showCalendar() {
    setupDiv.setAttribute('hidden', '');
    calendarDiv.removeAttribute('hidden');
    renderCalendar();
  }

  // ── Setup form rendering ─────────────────────────
  function renderSetupForm() {
    nameInput.value = (trip && trip.name) || '';
    placesContainer.innerHTML = '';
    
    if (trip && trip.places && trip.places.length > 0) {
      trip.places.forEach((place, idx) => {
        placesContainer.appendChild(makePlaceCard(place, idx));
      });
    } else {
      // Add one empty place card by default
      placesContainer.appendChild(makeEmptyPlaceCard(0));
    }
  }

  function makeEmptyPlaceCard(idx) {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.dataset.index = idx;
    card.innerHTML = `
      <div class="place-card-header">
        <span class="place-card-number">Place ${idx + 1}</span>
        ${idx > 0 ? `<button type="button" class="place-card-remove" data-index="${idx}">Remove</button>` : ''}
      </div>
      <input type="text" class="place-city" placeholder="City name (e.g. Paris)"
             autocomplete="off" maxlength="100" />
      <div class="place-dates-row">
        <label>From <input type="date" class="place-start" /></label>
        <label>To <input type="date" class="place-end" /></label>
      </div>
    `;
    
    // Add remove listener
    const removeBtn = card.querySelector('.place-card-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removePlace(idx));
    }
    
    return card;
  }

  function makePlaceCard(place, idx) {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.dataset.index = idx;
    card.dataset.id = place.id;
    card.innerHTML = `
      <div class="place-card-header">
        <span class="place-card-number">Place ${idx + 1}</span>
        ${idx > 0 ? `<button type="button" class="place-card-remove" data-index="${idx}">Remove</button>` : ''}
      </div>
      <input type="text" class="place-city" placeholder="City name (e.g. Paris)"
             autocomplete="off" maxlength="100" value="${place.city || ''}" />
      <div class="place-dates-row">
        <label>From <input type="date" class="place-start" value="${place.startDate || ''}" /></label>
        <label>To <input type="date" class="place-end" value="${place.endDate || ''}" /></label>
      </div>
    `;
    
    // Add remove listener
    const removeBtn = card.querySelector('.place-card-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removePlace(idx));
    }
    
    return card;
  }

  function removePlace(idx) {
    if (trip && trip.places) {
      trip.places.splice(idx, 1);
      if (trip.places.length === 0) {
        trip.places = [{ id: crypto.randomUUID(), city: '', startDate: '', endDate: '', lat: null, lon: null, weather: {}, days: {} }];
      }
      save();
      renderSetupForm();
    }
  }

  function addPlace() {
    if (!trip) trip = { name: '', places: [] };
    trip.places.push({
      id: crypto.randomUUID(),
      city: '',
      startDate: '',
      endDate: '',
      lat: null,
      lon: null,
      weather: {},
      days: {}
    });
    save();
    renderSetupForm();
  }

  addPlaceBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addPlace();
  });

  // ── Calendar render ────────────────────────────
  function renderCalendar() {
    if (!trip) return;
    
    titleEl.textContent = trip.name;
    
    // Calculate overall trip dates
    const allDates = [];
    if (trip.places && trip.places.length > 0) {
      trip.places.forEach(place => {
        if (place.startDate && place.endDate) {
          allDates.push(...getDates(place.startDate, place.endDate));
        }
      });
    }
    const uniqueDates = [...new Set(allDates)].sort();
    const overallStart = uniqueDates[0];
    const overallEnd = uniqueDates[uniqueDates.length - 1];
    
    subtitleEl.textContent = overallStart && overallEnd
      ? `${fmtShort(overallStart)} → ${fmtShort(overallEnd)}`
      : 'No dates set';
    
    weatherErrEl.textContent = '';
    placesSection.innerHTML = '';
    
    if (trip.places && trip.places.length > 0) {
      trip.places.forEach((place, idx) => {
        placesSection.appendChild(makePlaceSection(place, idx));
      });
    }
  }

  function makePlaceSection(place, idx) {
    const section = document.createElement('div');
    section.className = 'trip-place-block';
    
    const title = document.createElement('h3');
    title.className = 'trip-place-title';
    title.textContent = place.city || `Place ${idx + 1}`;
    
    const dates = document.createElement('p');
    dates.className = 'trip-place-dates';
    dates.textContent = place.startDate && place.endDate
      ? `${fmtShort(place.startDate)} → ${fmtShort(place.endDate)}`
      : 'No dates set';
    
    const daysDiv = document.createElement('div');
    daysDiv.className = 'trip-days';
    
    if (place.startDate && place.endDate) {
      getDates(place.startDate, place.endDate).forEach(d => {
        daysDiv.appendChild(makeDayCard(place, d));
      });
    }
    
    section.append(title, dates, daysDiv);
    return section;
  }

  function makeDayCard(place, dateStr) {
    const activities = (place.days && place.days[dateStr]) || [];
    const w = place.weather && place.weather[dateStr];

    const card = document.createElement('div');
    card.className = 'trip-day';
    card.id = `day-${place.id}-${dateStr}`;

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
    activities.forEach(act => ul.appendChild(makeActivityRow(place, dateStr, act)));

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
      if (!place.days) place.days = {};
      if (!place.days[dateStr]) place.days[dateStr] = [];
      place.days[dateStr].push({ id: crypto.randomUUID(), text });
      save();
      card.replaceWith(makeDayCard(place, dateStr));
      document.querySelector(`#day-${place.id}-${dateStr} .add-activity-bar input`)?.focus();
    }

    actBtn.addEventListener('click', doAdd);
    actIn.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
    addBar.append(actIn, actBtn);

    card.append(hdr, ul, addBar);
    return card;
  }

  function makeActivityRow(place, dateStr, act) {
    const li = document.createElement('li');
    li.className = 'activity-row';
    const span = document.createElement('span');
    span.textContent = act.text;
    const del = iconBtn('🗑️', 'Delete', 'delete', () => {
      place.days[dateStr] = (place.days[dateStr] || []).filter(a => a.id !== act.id);
      save();
      const old = document.getElementById(`day-${place.id}-${dateStr}`);
      if (old) old.replaceWith(makeDayCard(place, dateStr));
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

      const today    = localDateStr(new Date());
      const maxDate  = localDateStr(new Date(Date.now() + 6 * 86400000));
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

    const name = nameInput.value.trim();
    if (!name) {
      errorEl.textContent = 'Please enter a trip name.'; return;
    }

    // Gather place data from form
    const placesFormData = [];
    document.querySelectorAll('.place-card').forEach((card, idx) => {
      const city = card.querySelector('.place-city').value.trim();
      const start = card.querySelector('.place-start').value;
      const end = card.querySelector('.place-end').value;
      
      if (city && start && end) {
        if (start > end) {
          errorEl.textContent = `Place ${idx + 1}: Start date must be before or equal to end date.`;
          return;
        }
        if (getDates(start, end).length > 30) {
          errorEl.textContent = `Place ${idx + 1}: Cannot be longer than 30 days.`;
          return;
        }
        placesFormData.push({ city, start, end });
      }
    });

    if (placesFormData.length === 0) {
      errorEl.textContent = 'Please add at least one place with valid dates.'; return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Planning trip…';

    // Initialize trip with new data
    trip = {
      name,
      places: placesFormData.map((p, idx) => ({
        id: (trip?.places?.[idx]?.id) || crypto.randomUUID(),
        city: p.city,
        startDate: p.start,
        endDate: p.end,
        lat: (trip?.places?.[idx]?.lat) || null,
        lon: (trip?.places?.[idx]?.lon) || null,
        weather: (trip?.places?.[idx]?.weather) || {},
        days: (trip?.places?.[idx]?.days) || {}
      }))
    };
    save();
    showCalendar();

    // Fetch weather for all places
    try {
      for (let i = 0; i < trip.places.length; i++) {
        const place = trip.places[i];
        const res = await fetchWeatherDirect(place.city, place.startDate, place.endDate);
        if (res.error) {
          weatherErrEl.textContent = `⚠ ${place.city}: ${res.error}`;
        } else {
          place.lat = res.lat;
          place.lon = res.lon;
          place.weather = res.weather || {};
          save();
        }
      }
      renderCalendar();
    } catch (err) {
      weatherErrEl.textContent = '⚠ Could not fetch weather forecast.';
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Plan Trip →';
    }
  }

  // ── Clear Activities Modal ─────────────────────
  function openClearModal() {
    if (!trip || !trip.places || trip.places.length === 0) return;
    modalPlaceSel.innerHTML = '';
    trip.places.forEach((place, idx) => {
      const opt = document.createElement('option');
      opt.value = place.id;
      opt.textContent = place.city || `Place ${idx + 1}`;
      modalPlaceSel.appendChild(opt);
    });
    populateDaysInModal(trip.places[0].id);
    updateConfirmMsg();
    clearModal.removeAttribute('hidden');
  }

  function closeClearModal() {
    clearModal.setAttribute('hidden', '');
  }

  function populateDaysInModal(placeId) {
    const place = trip.places.find(p => p.id === placeId);
    modalDaySel.innerHTML = '<option value="all">All days</option>';
    if (place && place.startDate && place.endDate) {
      getDates(place.startDate, place.endDate).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = fmtFull(d);
        modalDaySel.appendChild(opt);
      });
    }
  }

  function updateConfirmMsg() {
    const place = trip.places.find(p => p.id === modalPlaceSel.value);
    const placeName = place ? (place.city || 'selected place') : 'selected place';
    if (modalDaySel.value === 'all') {
      modalConfirmMsg.textContent =
        `This will delete all activities for ${placeName}.`;
    } else {
      modalConfirmMsg.textContent =
        `This will delete all activities on ${fmtFull(modalDaySel.value)} in ${placeName}.`;
    }
  }

  function clearActivities() {
    console.log('clearActivities called');
    const place = trip.places.find(p => p.id === modalPlaceSel.value);
    console.log('Selected place:', place);
    console.log('Modal day value:', modalDaySel.value);
    if (!place) {
      console.log('Place not found!');
      return;
    }
    if (modalDaySel.value === 'all') {
      console.log('Clearing all days for', place.city);
      place.days = {};
    } else {
      console.log('Clearing day:', modalDaySel.value);
      if (place.days) place.days[modalDaySel.value] = [];
    }
    console.log('After clearing, place.days:', place.days);
    save();
    closeClearModal();
    if (!calendarDiv.hasAttribute('hidden')) {
      console.log('Rendering calendar');
      renderCalendar();
    } else {
      console.log('Rendering setup');
      showSetup();
    }
  }

  // Ensure modal starts hidden
  clearModal.setAttribute('hidden', '');

  form.addEventListener('submit', handleSubmit);
  editBtn.addEventListener('click', showSetup);
  clearSetupBtn.addEventListener('click', openClearModal);
  clearCalBtn.addEventListener('click', openClearModal);
  modalPlaceSel.addEventListener('change', () => {
    populateDaysInModal(modalPlaceSel.value);
    updateConfirmMsg();
  });
  modalDaySel.addEventListener('change', updateConfirmMsg);
  modalClearBtn.addEventListener('click', clearActivities);
  modalCancelBtn.addEventListener('click', closeClearModal);
  clearModal.addEventListener('click', e => { if (e.target === clearModal) closeClearModal(); });

  if (trip && trip.places && trip.places.length > 0) showCalendar(); else showSetup();
};
