// Interactive demo inside the laptop: a booking panel and a small bookkeeping app.
// Everything lives in memory. Nothing is stored and nothing leaves the page.

const byId = (id) => document.getElementById(id);
const MAX_ROWS = 40;
const MAX_AMOUNT = 10_000_000;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ── dates and money ──────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayIso = toIso(today);
const inDays = (days) => toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const number = new Intl.NumberFormat('tr-TR');
const money = (amount) => `${number.format(Math.round(amount))} TL`;
const dayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const monthYear = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('tr-TR', { month: 'short' });
const lower = (text) => text.toLocaleLowerCase('tr');

// ── demo data ────────────────────────────────────────
function seed() {
  const income = [38, 42, 35, 47, 51, 44, 58, 62, 49, 66, 71, 58];
  const expense = [29, 31, 28, 33, 35, 32, 38, 41, 36, 43, 46, 39];
  return {
    nextId: 100,
    bookings: [
      { id: 1, name: 'Selin Aydın', type: 'Nişan', date: inDays(-4), total: 64000, paid: 64000 },
      { id: 2, name: 'Elif Yıldız', type: 'Nişan', date: inDays(2), total: 72000, paid: 20000 },
      { id: 3, name: 'Buse Arslan', type: 'Kına', date: inDays(5), total: 48000, paid: 48000 },
      { id: 4, name: 'Derya Çelik', type: 'Düğün', date: inDays(9), total: 135000, paid: 40000 },
      { id: 5, name: 'Cansu Polat', type: 'Doğum günü', date: inDays(12), total: 18000, paid: 5000 },
      { id: 6, name: 'Ayşe Demir', type: 'Söz', date: inDays(16), total: 36000, paid: 36000 },
      { id: 7, name: 'Mert Kaya', type: 'Düğün', date: inDays(23), total: 120000, paid: 30000 },
    ],
    invoices: [
      { id: 1, firm: 'Örnek Lojistik A.Ş.', no: 'FT-2041', due: inDays(-5), total: 48500, paid: 20000 },
      { id: 2, firm: 'Örnek Hukuk Bürosu', no: 'FT-2044', due: inDays(4), total: 14600, paid: 0 },
      { id: 3, firm: 'Örnek Mimarlık', no: 'FT-2047', due: inDays(9), total: 22400, paid: 10000 },
      { id: 4, firm: 'Örnek Seyahat Ltd.', no: 'FT-2038', due: inDays(-12), total: 5800, paid: 5800 },
    ],
    todos: [
      { id: 1, text: 'KDV beyannamesini ver', monthly: true, done: false },
      { id: 2, text: 'Örnek Lojistik: vadesi geçen faturayı hatırlat', monthly: false, done: false },
      { id: 3, text: 'Ofis kirasını öde', monthly: true, done: false },
    ],
    // Oldest first; the last entry is the current month.
    months: income.map((value, index) => ({ income: value * 1000, expense: expense[index] * 1000 })),
  };
}

let state = seed();
const view = { calendar: false, query: '', filter: '', month: monthStart(today), payingId: null, flashId: null };

// ── toast ────────────────────────────────────────────
const toast = byId('demo-toast');
let toastTimer = 0;
function notify(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

// Reads a whole, positive TL amount from a number input; null when it is not one.
function readAmount(input, { min = 1, max = MAX_AMOUNT } = {}) {
  const value = Number(input.value);
  return input.value.trim() !== '' && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

// ── booking panel ────────────────────────────────────
const crmForm = byId('crm-form');
const crmError = byId('crm-form-error');
const remaining = (item) => item.total - item.paid;

function cell(label, text, className) {
  const td = el('td', className, text);
  td.dataset.label = label;
  return td;
}

function bookingRow(booking) {
  const row = el('tr', booking.id === view.flashId ? 'is-new' : '');
  const left = remaining(booking);
  const status = cell('Durum', undefined, 'cell-status');
  status.append(el('span', left > 0 ? 'badge badge-wait' : 'badge badge-ok', left > 0 ? 'Bekliyor' : 'Ödendi'));
  if (left > 0) {
    const collect = el('button', 'app-btn app-btn-small', 'Tahsil et');
    collect.type = 'button';
    collect.setAttribute('aria-label', `${booking.name}: kalan ${money(left)} tutarı tahsil et`);
    collect.addEventListener('click', () => {
      booking.paid = booking.total;
      renderCrm();
      notify(`${booking.name}: ${money(left)} tahsil edildi.`);
    });
    status.append(collect);
  }
  row.append(
    cell('Müşteri', booking.name, 'cell-name'),
    cell('Etkinlik', booking.type),
    cell('Tarih', dayMonth.format(fromIso(booking.date))),
    cell('Tutar', money(booking.total), 'num'),
    cell('Alınan', money(booking.paid), 'num'),
    cell('Kalan', money(left), 'num'),
    status,
  );
  return row;
}

function renderCalendar() {
  const first = view.month;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // weeks start on Monday
  byId('cal-title').textContent = monthYear.format(first);

  const cells = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((name) => el('div', 'cal-dow', name));
  for (let i = 0; i < offset; i++) cells.push(el('div', 'cal-day is-blank'));
  for (let day = 1; day <= days; day++) {
    const iso = toIso(new Date(first.getFullYear(), first.getMonth(), day));
    const box = el('div', iso === todayIso ? 'cal-day is-today' : 'cal-day');
    box.append(el('span', 'cal-num', String(day)));
    for (const booking of state.bookings.filter((b) => b.date === iso)) {
      const chip = el('button', remaining(booking) > 0 ? 'cal-event' : 'cal-event is-paid', booking.name);
      chip.type = 'button';
      chip.title = `${booking.name} · ${booking.type}`;
      chip.setAttribute('aria-label', `${booking.name}, ${booking.type}: listede göster`);
      chip.addEventListener('click', () => {
        view.query = booking.name;
        view.filter = '';
        byId('crm-search').value = booking.name;
        byId('crm-filter').value = '';
        setCalendar(false);
      });
      box.append(chip);
    }
    cells.push(box);
  }
  byId('cal-grid').replaceChildren(...cells);
}

function renderCrm() {
  const sum = (key) => state.bookings.reduce((total, booking) => total + booking[key], 0);
  byId('crm-stat-count').textContent = String(state.bookings.length);
  byId('crm-stat-total').textContent = money(sum('total'));
  byId('crm-stat-paid').textContent = money(sum('paid'));
  byId('crm-stat-open').textContent = money(sum('total') - sum('paid'));

  const query = lower(view.query.trim());
  const rows = state.bookings
    .filter((booking) => lower(booking.name).includes(query))
    .filter((booking) => !view.filter || (view.filter === 'open') === remaining(booking) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  byId('crm-rows').replaceChildren(...rows.map(bookingRow));
  byId('crm-empty').hidden = rows.length > 0;
  view.flashId = null;
  renderCalendar();
}

function setCalendar(on) {
  view.calendar = on;
  byId('crm-view-list').setAttribute('aria-pressed', String(!on));
  byId('crm-view-cal').setAttribute('aria-pressed', String(on));
  byId('crm-list-view').hidden = on;
  byId('crm-cal-view').hidden = !on;
  renderCrm();
}

function closeForm() {
  crmForm.hidden = true;
  crmForm.reset();
  crmError.hidden = true;
}

byId('crm-view-list').addEventListener('click', () => setCalendar(false));
byId('crm-view-cal').addEventListener('click', () => setCalendar(true));
byId('cal-prev').addEventListener('click', () => { view.month = new Date(view.month.getFullYear(), view.month.getMonth() - 1, 1); renderCalendar(); });
byId('cal-next').addEventListener('click', () => { view.month = new Date(view.month.getFullYear(), view.month.getMonth() + 1, 1); renderCalendar(); });
byId('crm-search').addEventListener('input', (event) => { view.query = event.target.value; renderCrm(); });
byId('crm-filter').addEventListener('change', (event) => { view.filter = event.target.value; renderCrm(); });

byId('crm-new').addEventListener('click', () => {
  crmForm.hidden = false;
  crmForm.elements.date.value = inDays(7);
  crmForm.elements.name.focus();
});
byId('crm-cancel').addEventListener('click', () => { closeForm(); byId('crm-new').focus(); });
crmForm.addEventListener('input', () => { crmError.hidden = true; });
crmForm.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeForm(); byId('crm-new').focus(); }
});

crmForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = crmForm.elements;
  const name = fields.name.value.trim().replace(/\s+/g, ' ');
  const date = fields.date.value;
  const total = readAmount(fields.total);
  const paid = fields.paid.value.trim() === '' ? 0 : readAmount(fields.paid, { min: 0 });

  let problem = '';
  if (state.bookings.length >= MAX_ROWS) problem = `Demo en fazla ${MAX_ROWS} randevu tutar. "Sıfırla" ile baştan başlayabilirsiniz.`;
  else if (!name) problem = 'Ad soyad yazın.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problem = 'Bir tarih seçin.';
  else if (total === null) problem = `Toplam tutar 1 ile ${number.format(MAX_AMOUNT)} TL arasında tam sayı olmalı.`;
  else if (paid === null) problem = 'Kapora 0 veya daha büyük bir tam sayı olmalı.';
  else if (paid > total) problem = 'Kapora toplam tutarı aşamaz.';
  if (problem) {
    crmError.textContent = problem;
    crmError.hidden = false;
    return;
  }

  const booking = { id: state.nextId++, name: name.slice(0, 40), type: fields.type.value, date, total, paid };
  state.bookings.push(booking);
  view.query = '';
  view.filter = '';
  view.flashId = booking.id;
  view.month = monthStart(fromIso(date));
  byId('crm-search').value = '';
  byId('crm-filter').value = '';
  closeForm();
  renderCrm();
  notify(`${booking.name} için randevu eklendi. Rakamlar güncellendi.`);
});

// ── bookkeeping ──────────────────────────────────────
function invoiceItem(invoice) {
  const item = el('li', 'fin-invoice');
  const left = remaining(invoice);
  const late = left > 0 && invoice.due < todayIso;

  const firm = el('div', 'fin-firm');
  firm.append(el('strong', '', invoice.firm), el('span', left === 0 ? 'badge badge-ok' : late ? 'badge badge-late' : 'badge badge-wait', left === 0 ? 'Ödendi' : late ? 'Vadesi geçti' : 'Bekliyor'));
  const meta = el('p', 'fin-meta', `${invoice.no} · Vade ${dayMonth.format(fromIso(invoice.due))}`);

  const amounts = el('p', 'fin-amounts');
  for (const [label, value] of [['Tutar', invoice.total], ['Alınan', invoice.paid], ['Kalan', left]]) {
    const part = el('span', '', `${label} `);
    part.append(el('b', '', money(value)));
    amounts.append(part);
  }
  item.append(firm, meta, amounts);
  if (left === 0) return item;

  if (view.payingId !== invoice.id) {
    const open = el('button', 'app-btn app-btn-small fin-pay-open', 'Ödeme al');
    open.type = 'button';
    open.setAttribute('aria-label', `${invoice.firm}: ödeme al`);
    open.addEventListener('click', () => {
      view.payingId = invoice.id;
      renderFinance();
      byId('fin-pay-amount')?.select();
    });
    item.append(open);
    return item;
  }

  const form = el('form', 'fin-pay');
  form.noValidate = true;
  const amount = el('input', 'app-input');
  Object.assign(amount, { id: 'fin-pay-amount', type: 'number', inputMode: 'numeric', min: '1', max: String(left), step: '100', value: String(left) });
  amount.setAttribute('aria-label', `${invoice.firm} için ödeme tutarı (TL)`);
  const save = el('button', 'app-btn app-btn-primary app-btn-small', 'Kaydet');
  save.type = 'submit';
  const cancel = el('button', 'app-btn app-btn-small', 'Vazgeç');
  cancel.type = 'button';
  const error = el('p', 'app-error');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  cancel.addEventListener('click', () => { view.payingId = null; renderFinance(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const paid = readAmount(amount, { max: left });
    if (paid === null) {
      error.textContent = `1 ile ${number.format(left)} TL arasında tam sayı girin.`;
      error.hidden = false;
      return;
    }
    invoice.paid += paid;
    state.months.at(-1).income += paid;
    view.payingId = null;
    renderFinance();
    notify(remaining(invoice) > 0
      ? `${money(paid)} tahsil edildi. Kalan: ${money(remaining(invoice))}.`
      : `${money(paid)} tahsil edildi. Fatura kapandı.`);
  });
  form.append(amount, save, cancel, error);
  item.append(form);
  return item;
}

function todoItem(todo) {
  const item = el('li');
  const label = el('label', todo.done ? 'fin-todo is-done' : 'fin-todo');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = todo.done;
  const text = el('span');
  text.append(el('span', 'fin-todo-text', todo.text));
  const nextRun = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  if (todo.monthly) text.append(el('small', '', todo.done ? `Sonraki hatırlatma: ${dayMonth.format(nextRun)}` : 'Her ay tekrarlar'));
  box.addEventListener('change', () => {
    todo.done = box.checked;
    renderFinance();
    if (todo.done) notify(todo.monthly ? `Tamamlandı. Sonraki hatırlatma ${dayMonth.format(nextRun)} tarihine kuruldu.` : 'Tamamlandı.');
  });
  label.append(box, text);
  item.append(label);
  return item;
}

function renderChart() {
  const peak = Math.max(1, ...state.months.flatMap((month) => [month.income, month.expense]));
  const columns = state.months.map((month, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (state.months.length - 1 - index), 1);
    const column = el('div', index === state.months.length - 1 ? 'fin-col is-current' : 'fin-col');
    column.title = `${monthYear.format(date)}: gelir ${money(month.income)}, gider ${money(month.expense)}`;
    const bars = el('div', 'fin-bars');
    for (const value of [month.income, month.expense]) {
      const bar = el('i');
      bar.style.setProperty('--h', `${Math.max(2, (100 * value) / peak).toFixed(1)}%`);
      bars.append(bar);
    }
    column.append(bars, el('span', '', monthShort.format(date)));
    return column;
  });
  byId('fin-chart').replaceChildren(...columns);
}

function renderFinance() {
  const open = state.invoices.reduce((total, invoice) => total + remaining(invoice), 0);
  const late = state.invoices.filter((invoice) => invoice.due < todayIso).reduce((total, invoice) => total + remaining(invoice), 0);
  byId('fin-stat-open').textContent = money(open);
  byId('fin-stat-late').textContent = money(late);
  byId('fin-stat-in').textContent = money(state.months.at(-1).income);
  byId('fin-stat-out').textContent = money(state.months.at(-1).expense);
  byId('fin-invoices').replaceChildren(...state.invoices.map(invoiceItem));
  byId('fin-todos').replaceChildren(...state.todos.map(todoItem));
  renderChart();
}

const expenseForm = byId('fin-expense');
expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const amount = readAmount(expenseForm.elements.amount);
  if (amount === null) {
    notify(`Gider tutarı 1 ile ${number.format(MAX_AMOUNT)} TL arasında tam sayı olmalı.`);
    expenseForm.elements.amount.focus();
    return;
  }
  state.months.at(-1).expense += amount;
  const category = expenseForm.elements.category.value;
  expenseForm.reset();
  renderFinance();
  notify(`${category}: ${money(amount)} gider eklendi. Grafik güncellendi.`);
});

// ── app tabs ─────────────────────────────────────────
const tabs = [...document.querySelectorAll('.os-tab')];

function selectTab(tab, { focus = false } = {}) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute('aria-selected', String(selected));
    other.tabIndex = selected ? 0 : -1;
    byId(other.getAttribute('aria-controls')).hidden = !selected;
  }
  byId('demo-reset').hidden = tab.id === 'os-tab-flow';
  if (focus) tab.focus();
  document.dispatchEvent(new CustomEvent('demo:tab', { detail: tab.id }));
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    selectTab(tabs[(index + step + tabs.length) % tabs.length], { focus: true });
  });
});

byId('demo-reset').addEventListener('click', () => {
  state = seed();
  Object.assign(view, { query: '', filter: '', month: monthStart(today), payingId: null, flashId: null });
  byId('crm-search').value = '';
  byId('crm-filter').value = '';
  closeForm();
  expenseForm.reset();
  renderCrm();
  renderFinance();
  notify('Demo ilk haline döndü.');
});

renderCrm();
renderFinance();
