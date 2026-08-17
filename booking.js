// ============================================================================
// Royal Nails + Spa — Booking widget (front-end demo only)
// This runs entirely in the browser. Nothing here is sent to a server or
// saved anywhere — it exists to show how the booking FLOW would feel once
// connected to a real scheduling backend. See the info panel on the page
// for what a live version would need.
// ============================================================================

(function () {
  const grid = document.getElementById('serviceGrid');
  if (!grid) return; // not on the booking page

  const SERVICES = [
    { id: 'classic-mani', name: 'Classic Manicure', price: '$25', mins: 30 },
    { id: 'gel-mani', name: 'Gel Manicure', price: '$40', mins: 45 },
    { id: 'dip-mani', name: 'Dip Powder Manicure', price: '$45', mins: 50 },
    { id: 'classic-pedi', name: 'Classic Pedicure', price: '$35', mins: 40 },
    { id: 'gel-pedi', name: 'Gel Pedicure', price: '$48', mins: 55 },
    { id: 'spa-pedi', name: 'Spa Pedicure', price: '$55', mins: 60 },
    { id: 'acrylic-full', name: 'Acrylic Full Set', price: '$50+', mins: 75 },
    { id: 'wax-brow', name: 'Eyebrow Wax', price: '$12', mins: 15 },
  ];

  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // ---- state ----
  const state = {
    service: null,
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedDate: null, // 'YYYY-MM-DD'
    selectedTime: null,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 45);

  // ---- elements ----
  const serviceGrid = document.getElementById('serviceGrid');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calDow = document.getElementById('calDow');
  const calDays = document.getElementById('calDays');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const timeGrid = document.getElementById('timeGrid');
  const summaryBar = document.getElementById('summaryBar');
  const confirmBtn = document.getElementById('confirmBtn');
  const formError = document.getElementById('formError');
  const ticketPreviewNum = document.getElementById('ticketPreviewNum');

  const fName = document.getElementById('fName');
  const fPhone = document.getElementById('fPhone');
  const fEmail = document.getElementById('fEmail');
  const fNotes = document.getElementById('fNotes');

  const bookingForm = document.getElementById('bookingForm');
  const ticketCard = document.getElementById('ticketCard');

  // ---- render: services ----
  function renderServices() {
    serviceGrid.innerHTML = SERVICES.map(s => `
      <button type="button" class="pill${state.service === s.id ? ' selected' : ''}" data-id="${s.id}">
        <span class="p-name">${s.name}</span>
        <span class="p-price">${s.price} &middot; ${s.mins} min</span>
      </button>
    `).join('');
    serviceGrid.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        state.service = btn.dataset.id;
        renderServices();
        renderTimes(); // duration could affect slots later; re-render for consistency
        updateSummary();
        validate();
      });
    });
  }

  // ---- render: calendar ----
  function fmtDateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function renderCalendar() {
    calMonthLabel.textContent = `${MONTH_NAMES[state.viewMonth]} ${state.viewYear}`;
    calDow.innerHTML = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');

    const firstDay = new Date(state.viewYear, state.viewMonth, 1).getDay();
    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(state.viewYear, state.viewMonth, d);
      dateObj.setHours(0, 0, 0, 0);
      const key = fmtDateKey(state.viewYear, state.viewMonth, d);
      const disabled = dateObj < today || dateObj > maxDate;
      const selected = state.selectedDate === key;
      html += `<div class="cal-day${disabled ? ' disabled' : ''}${selected ? ' selected' : ''}" data-key="${key}" ${disabled ? '' : 'tabindex="0" role="button"'}>${d}</div>`;
    }
    calDays.innerHTML = html;

    calDays.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(el => {
      el.addEventListener('click', () => selectDate(el.dataset.key));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDate(el.dataset.key); } });
    });

    prevMonthBtn.disabled = (state.viewYear === today.getFullYear() && state.viewMonth === today.getMonth());
    const maxViewable = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    nextMonthBtn.disabled = (state.viewYear === maxViewable.getFullYear() && state.viewMonth === maxViewable.getMonth());
  }

  function selectDate(key) {
    state.selectedDate = key;
    state.selectedTime = null;
    renderCalendar();
    renderTimes();
    updateSummary();
    validate();
  }

  prevMonthBtn.addEventListener('click', () => {
    state.viewMonth -= 1;
    if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear -= 1; }
    renderCalendar();
  });
  nextMonthBtn.addEventListener('click', () => {
    state.viewMonth += 1;
    if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear += 1; }
    renderCalendar();
  });

  // ---- render: time slots ----
  // Simple deterministic "pseudo-availability" so the same date always shows
  // the same open/booked pattern in this demo, without needing a backend.
  function seededRandom(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return () => {
      h = (h * 9301 + 49297) % 233280;
      return h / 233280;
    };
  }

  function getHoursForDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    // Sunday shorter hours
    return dow === 0 ? { start: 10 * 60, end: 18 * 60 } : { start: 9.5 * 60, end: 19 * 60 };
  }

  function renderTimes() {
    if (!state.selectedDate) {
      timeGrid.innerHTML = `<div class="time-empty">Pick a date to see open times.</div>`;
      return;
    }
    const { start, end } = getHoursForDate(state.selectedDate);
    const rand = seededRandom(state.selectedDate + (state.service || ''));
    const slots = [];
    for (let mins = start; mins < end; mins += 45) {
      const taken = rand() < 0.22; // ~22% of slots appear already booked
      const h24 = Math.floor(mins / 60);
      const mm = mins % 60;
      const h12 = ((h24 + 11) % 12) + 1;
      const ampm = h24 < 12 ? 'AM' : 'PM';
      slots.push({ label: `${h12}:${String(mm).padStart(2, '0')} ${ampm}`, mins, taken });
    }

    // if selected date is today, hide past-hour slots
    const isToday = (() => {
      const [y, m, d] = state.selectedDate.split('-').map(Number);
      const dd = new Date(y, m - 1, d);
      return dd.getTime() === today.getTime();
    })();
    const nowMins = today.getTime() === (new Date()).setHours(0,0,0,0) ? (new Date()).getHours() * 60 + (new Date()).getMinutes() : -1;

    const visible = slots.filter(s => !isToday || s.mins > nowMins + 30);

    if (!visible.length) {
      timeGrid.innerHTML = `<div class="time-empty">No more openings today — try another date.</div>`;
      return;
    }

    timeGrid.innerHTML = visible.map(s => `
      <button type="button" class="time-pill${s.taken ? ' disabled' : ''}${state.selectedTime === s.label ? ' selected' : ''}"
        ${s.taken ? 'disabled' : ''} data-label="${s.label}" style="${s.taken ? 'opacity:.35;cursor:not-allowed;' : ''}">
        ${s.label}
      </button>
    `).join('');

    timeGrid.querySelectorAll('.time-pill:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedTime = btn.dataset.label;
        renderTimes();
        updateSummary();
        validate();
      });
    });
  }

  // ---- summary + validation ----
  function updateSummary() {
    const svc = SERVICES.find(s => s.id === state.service);
    if (!svc && !state.selectedDate && !state.selectedTime) {
      summaryBar.innerHTML = `<span class="empty-note">Select a service to begin.</span>`;
      return;
    }
    const parts = [];
    if (svc) parts.push(`<strong>${svc.name}</strong>`);
    if (state.selectedDate) {
      const [y, m, d] = state.selectedDate.split('-').map(Number);
      const dd = new Date(y, m - 1, d);
      parts.push(dd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    if (state.selectedTime) parts.push(state.selectedTime);
    summaryBar.innerHTML = parts.length
      ? parts.join(' <span class="mono" style="color:var(--espresso-soft);">&middot;</span> ')
      : `<span class="empty-note">Select a service to begin.</span>`;
  }

  function validate() {
    const ok = state.service && state.selectedDate && state.selectedTime;
    confirmBtn.disabled = !ok;
  }

  [fName, fPhone].forEach(el => el && el.addEventListener('input', () => { formError.style.display = 'none'; }));

  // ---- confirm booking ----
  function pad(n) { return String(n).padStart(2, '0'); }

  function buildTicketNumber() {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `RN-${today.getFullYear()}-${n}`;
  }

  function to24h(label) {
    const [time, ampm] = label.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return { h, m };
  }

  function downloadICS(svc, dateKey, timeLabel, name) {
    const [y, mo, d] = dateKey.split('-').map(Number);
    const { h, m } = to24h(timeLabel);
    const start = new Date(y, mo - 1, d, h, m);
    const end = new Date(start.getTime() + (svc.mins || 45) * 60000);
    const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Royal Nails + Spa//Booking Demo//EN','BEGIN:VEVENT',
      `UID:${Date.now()}@royalnailsspa-demo`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${svc.name} — Royal Nails + Spa`,
      `DESCRIPTION:Appointment for ${name || 'Guest'} at Royal Nails + Spa.`,
      'LOCATION:380 Monroe Turnpike\\, Ste 4\\, Monroe\\, CT 06468',
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'royal-nails-appointment.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  confirmBtn.addEventListener('click', () => {
    if (!fName.value.trim() || !fPhone.value.trim()) {
      formError.textContent = 'Please add your name and phone number to confirm.';
      formError.style.display = 'block';
      return;
    }
    const svc = SERVICES.find(s => s.id === state.service);
    const [y, m, d] = state.selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const ticketNum = buildTicketNumber();

    document.getElementById('tkName').textContent = fName.value.trim();
    document.getElementById('tkService').textContent = `${svc.name} (${svc.price})`;
    document.getElementById('tkDate').textContent = dateLabel;
    document.getElementById('tkTime').textContent = state.selectedTime;
    document.getElementById('tkNum').textContent = `Confirmation ${ticketNum} — preview only, not yet sent to the studio`;

    document.getElementById('icsBtn').onclick = () => downloadICS(svc, state.selectedDate, state.selectedTime, fName.value.trim());

    bookingForm.style.display = 'none';
    ticketCard.style.display = 'block';
    ticketCard.classList.add('in');
    ticketCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('newBookingBtn').addEventListener('click', () => {
    state.service = null;
    state.selectedDate = null;
    state.selectedTime = null;
    fName.value = ''; fPhone.value = ''; fEmail.value = ''; fNotes.value = '';
    renderServices();
    renderCalendar();
    renderTimes();
    updateSummary();
    validate();
    ticketCard.style.display = 'none';
    bookingForm.style.display = 'block';
    bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---- init ----
  renderServices();
  renderCalendar();
  renderTimes();
  updateSummary();
  validate();
  ticketPreviewNum.textContent = `RN-${today.getFullYear()}-PREVIEW`;
})();
