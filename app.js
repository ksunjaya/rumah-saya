'use strict';
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const compact = n => Math.abs(n) >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
const duration = m => `${Math.floor(m / 12)}y ${m % 12}m`;
const keys = Object.keys(Mortgage.defaults).filter(k => k !== 'prepayments');
const storageKey = 'ruang-mortgage-v2';
const dateLabel = d => new Intl.DateTimeFormat('en-GB', {month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(d+'-01T00:00:00Z'));
const payoffText = r => r.paidOff ? duration(r.months) : 'Not repaid within 50 years';
let current, baseline, config, pins = [], interval = 'yearly', page = 0, pinCounter = 0;
function readConfig() {
  const c = Object.fromEntries(keys.map(k => [k, ['startDate','strategy'].includes(k) ? $(k).value : ($(k).value.trim() === '' ? NaN : Number($(k).value))]));
  c.prepayments = [...document.querySelectorAll('.prepayment')].map(row => ({ month: Mortgage.monthIndex(c.startDate, row.querySelector('[data-month]').value), amount: Number(row.querySelector('[data-amount]').value) }));
  return c;
}
function addPrepayment(p = { month: 12, amount: 10000000 }) {
  const row = document.createElement('div'); row.className = 'prepayment';
  row.innerHTML = '<div><label>Payment date<input data-month type="month" required aria-label="Extra payment month and year"></label></div><div><label>Amount · Rp<input data-amount type="number" min="1" max="1000000000000000" aria-label="Prepayment amount in rupiah"></label></div><button type="button" aria-label="Remove prepayment">×</button>';
  row.querySelector('[data-month]').value = Mortgage.dateAt($('startDate').value || Mortgage.defaults.startDate, p.month - 1); row.querySelector('[data-amount]').value = p.amount;
  row.querySelector('button').onclick = () => { row.remove(); render(); };
  $('prepayments').append(row);
}
function fill(c) { keys.forEach(k => { $(k).value = c[k]; }); $('prepayments').replaceChildren(); c.prepayments.forEach(addPrepayment); }
function theme(value) { if (value === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = value; }
function render() {
  page = 0; config = readConfig(); current = Mortgage.calculate(config); baseline = null;
  keys.forEach(k => $(k).setAttribute('aria-invalid', String(!$(k).checkValidity() || (!['startDate','strategy'].includes(k) && !Number.isFinite(config[k])))));
  document.querySelectorAll('.prepayment').forEach(row => {
    const month = row.querySelector('[data-month]'), amount = row.querySelector('[data-amount]');
    month.min = config.startDate; month.max = /^\d{4}-\d{2}$/.test(config.startDate) ? Mortgage.dateAt(config.startDate, 599) : ''; 
    month.setAttribute('aria-invalid', String(!month.value || !month.checkValidity()));
    amount.setAttribute('aria-invalid', String(!amount.value || !amount.checkValidity()));
  });
  $('principalHint').textContent = Number.isFinite(config.principal) ? money(config.principal) : '';
  $('salaryHint').textContent = Number.isFinite(config.salary) ? money(config.salary) : '';
  const invalid = current.errors.length > 0;
  $('errors').hidden = !invalid; $('resultContent').hidden = invalid; $('warnings').hidden = true;
  if (invalid) { $('errors').replaceChildren(); const title = document.createElement('strong'); title.textContent = 'Check your inputs to continue'; $('errors').append(title); const list = document.createElement('ul'); current.errors.forEach(e => { const item = document.createElement('li'); item.textContent = e; list.append(item); }); $('errors').append(list); return; }
  baseline = Mortgage.calculate(config, false);
  const warnings = [];
  const budgetMode = config.strategy === 'budget';
  $('strategyNote').textContent = budgetMode ? 'Pays only your chosen salary percentage plus optional extras. No automatic top-ups. Projection continues up to 50 years to find your payoff date.' : 'Pays the fixed contractual installment, regardless of salary allocation. Allocation is an affordability check only. Optional extras may shorten the term.';
  if (budgetMode && current.belowMinimumMonths) warnings.push(`Your actual payments fall below the contractual installment in ${current.belowMinimumMonths} month(s). This projection assumes the lender permits that payment pattern; it does not add money from elsewhere or model arrears fees. Finishing within the term does not remove these earlier installment gaps.`);
  if (!budgetMode && current.shortfallMonths) warnings.push(`The contract installment exceeds your allocated salary in ${current.shortfallMonths} month(s). This contract-schedule view shows the required payment; choose “Use only my salary allocation” to see what your budget alone achieves.`);
  if (current.growingMonths) warnings.push(`Payments do not cover interest in ${current.growingMonths} month(s), so unpaid interest increases the balance in this projection.`);
  const unused = config.prepayments.filter(p => p.month > current.months);
  if (unused.length) warnings.push(`${unused.length} extra payment(s) fall after payoff and are unused.`);
  if (warnings.length) { $('warnings').hidden = false; $('warnings').textContent = warnings.join(' '); }
  $('planBadge').textContent = budgetMode ? 'SALARY BUDGET' : 'CONTRACT SCHEDULE';
  $('payoff').textContent = current.paidOff ? payoffText(current) : 'Not repaid in 50 years';
  $('timeSaved').textContent = current.paidOff ? `Payoff: ${dateLabel(current.payoffDate)} · ${current.months === baseline.months ? 'at contractual maturity' : duration(Math.abs(baseline.months-current.months)) + (current.months < baseline.months ? ' earlier' : ' later')}` : `${money(current.balance)} still owed at the end of the 50-year projection`;
  $('planSummary').textContent = `Contract maturity: ${dateLabel(current.maturityDate)} (${config.years} years). ${current.maturityBalance > .01 ? money(current.maturityBalance) + ' remains at that date.' : 'Your projected balance is zero by that date.'} The contractual installment initially requires ${config.salary > 0 ? (current.minimum/config.salary*100).toFixed(1)+'% of your net salary' : 'income beyond your current salary'}.`;
  const saved = baseline.totalInterest - current.totalInterest;
  $('interestSavedLabel').textContent = !current.paidOff ? 'Interest comparison' : saved >= 0 ? 'Interest saved vs. minimum-only' : 'Extra interest vs. minimum-only';
  $('interestSaved').textContent = current.paidOff ? money(Math.abs(saved)) : 'Plan not repaid';
  $('firstPayment').textContent = money(current.rows[0].regular);
  $('minimum').textContent = money(current.minimum);
  $('contractTerm').textContent = `Fixed for ${config.years} years · maturity ${dateLabel(current.maturityDate)}`;
  $('interestLabel').textContent = current.paidOff ? 'Total interest · your plan' : 'Interest accrued · 50 years';
  $('paidLabel').textContent = current.paidOff ? 'Total paid · your plan' : 'Payments made · 50 years';
  $('totalInterest').textContent = money(current.totalInterest);
  $('interestRatio').textContent = `${(current.totalInterest / config.principal * 100).toFixed(1)}% of the original principal`;
  $('totalPaid').textContent = money(current.totalPaid);
  $('realPaid').textContent = `${money(current.realPaid)} in today's rupiah`;
  $('chartMonth').max = Math.max(config.years * 12, current.months); $('chartMonth').value = Math.min(Number($('chartMonth').value), Number($('chartMonth').max));
  renderChart(); renderComparison(); renderSchedule();
}
function renderChart() {
  if (!baseline) return;
  const real = $('valueBasis').value === 'real', maxMonth = Math.max(config.years * 12, current.months);
  const valueAt = (result, m) => m === 0 ? config.principal : result.rows[m - 1]?.[real ? 'realBalance' : 'balance'] || 0;
  const maxValue = Math.max(config.principal, ...[...baseline.rows,...current.rows].map(r => real ? r.realBalance : r.balance));
  const W = 680, H = 255, L = 59, R = 15, T = 18, B = 32;
  const x = m => L + m / maxMonth * (W - L - R), y = v => H - B - v / maxValue * (H - T - B);
  let lines = '';
  for (let i = 0; i <= 4; i++) { const v = maxValue * i / 4; lines += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" fill="var(--muted)" font-size="10">${compact(v)}</text>`; }
  for (let i = 0; i <= 4; i++) { const m = maxMonth * i / 4; lines += `<text x="${x(m)}" y="${H - 8}" text-anchor="middle" fill="var(--muted)" font-size="10">${+(m / 12).toFixed(1)}y</text>`; }
  const path = result => Array.from({ length: maxMonth + 1 }, (_, m) => `${m === 0 ? 'M' : 'L'}${x(m).toFixed(2)},${y(valueAt(result, m)).toFixed(2)}`).join(' ');
  const m = Number($('chartMonth').value);
  $('chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Outstanding balance over ${maxMonth / 12} years. Your plan: ${payoffText(current)}; minimum-only in ${baseline.months} months. Use the month slider below to inspect exact values."><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".16"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${lines}<path d="${path(current)} L${x(maxMonth)},${y(0)} L${x(0)},${y(0)} Z" fill="url(#area)"/><path d="${path(baseline)}" fill="none" stroke="#a1afa4" stroke-width="2" stroke-dasharray="5 5"/><path d="${path(current)}" fill="none" stroke="var(--accent)" stroke-width="3"/><line x1="${x(m)}" x2="${x(m)}" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="3 4"/><circle cx="${x(m)}" cy="${y(valueAt(current, m))}" r="4" fill="var(--accent)"/><circle cx="${x(m)}" cy="${y(valueAt(baseline, m))}" r="3" fill="#a1afa4"/></svg>`;
  $('monthLabel').textContent = m === 0 ? '0 · before first payment' : `${m} · ${dateLabel(Mortgage.dateAt(config.startDate,m-1))}`;
  $('chartReadout').innerHTML = `<span>Your balance <b>${money(valueAt(current, m))}</b></span><span>Minimum-only balance <b>${money(valueAt(baseline, m))}</b></span><span>${real ? "Today's" : 'Nominal'} rupiah · end of month</span>`;
  $('chart').querySelector('svg').onpointerdown = e => { const rect = e.currentTarget.getBoundingClientRect(); const position = (e.clientX - rect.left) / rect.width * W; $('chartMonth').value = Math.max(0, Math.min(maxMonth, Math.round((position - L) / (W - L - R) * maxMonth))); renderChart(); };
}
function renderComparison() {
  const scenarios = [{ name: 'Minimum only', c: config, result: baseline }, { name: 'Your plan', c: config, result: current }, ...pins.map(p => ({ name: `Snapshot ${p.id}`, c: p.config, result: Mortgage.calculate(p.config) }))];
  const fields = [['Loan principal', s => money(s.c.principal)], ['Salary allocation', s => s.name === 'Minimum only' ? 'Minimum only' : `${s.c.allocation}%`], ['Contractual minimum', s => money(s.result.minimum)], ['Actual payoff', s => payoffText(s.result)], ['Interest accrued', s => money(s.result.totalInterest)], ['Payments made', s => money(s.result.totalPaid)], ["Repaid · today's Rp", s => money(s.result.realPaid)], ['Balance at contract maturity', s => money(s.result.maturityBalance)], ['Unpaid balance at projection end', s => money(s.result.balance)], ['Below-installment months', s => s.result.belowMinimumMonths], ['Payment plan', s => s.name === 'Minimum only' || s.c.strategy === 'contract' ? 'Contract schedule' : 'Salary allocation']];
  $('comparison').innerHTML = `<thead><tr><th scope="col">Measure</th>${scenarios.map(s => `<th scope="col">${s.name}</th>`).join('')}</tr></thead><tbody>${fields.map(([name, fn]) => `<tr><th scope="row">${name}</th>${scenarios.map(s => `<td>${fn(s)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  $('pinnedControls').replaceChildren();
  pins.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'button secondary small'; b.textContent = `Remove snapshot ${p.id}`; b.onclick = () => { pins = pins.filter(item => item.id !== p.id); renderComparison(); }; $('pinnedControls').append(b); });
  $('pin').disabled = pins.length >= 2;
}
function renderSchedule() {
  if (!baseline) return;
  const real = $('valueBasis').value === 'real';
  const rows = interval === 'yearly' ? Mortgage.yearly(current.rows) : current.rows;
  const pages = Math.ceil(rows.length / 12); page = Math.min(page, pages - 1);
  const fields = [['payment', 'Paid'], ['principal', 'Principal'], ['interest', 'Interest'], ['extra', 'Salary extra'], ['bonus', 'Bonus'], ['prepayment', 'Prepayment'], ['balance', 'Balance']];
  if (real) fields.push(['realPayment', 'Paid · today’s Rp'], ['realBalance', 'Balance · today’s Rp']);
  $('schedule').innerHTML = `<thead><tr><th scope="col">${interval === 'yearly' ? 'Year' : 'Month'}</th>${fields.map(([, name]) => `<th scope="col">${name}</th>`).join('')}</tr></thead><tbody>${rows.slice(page * 12, (page + 1) * 12).map(r => `<tr><th scope="row">${interval === 'monthly' ? dateLabel(r.date) + ' · ' + r.month : 'Loan year ' + r.month + ' · ' + dateLabel(Mortgage.dateAt(config.startDate,(r.month-1)*12))}</th>${fields.map(([key]) => `<td>${money(r[key])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  $('pageInfo').textContent = `${page * 12 + 1}–${Math.min((page + 1) * 12, rows.length)} of ${rows.length} ${interval === 'yearly' ? 'years' : 'months'}`;
  $('prev').disabled = page === 0; $('next').disabled = page >= pages - 1;
  $('scheduleNote').textContent = `Rounded to Rp1. ${real ? 'Real-value columns added.' : 'Nominal values.'} Loan years start in your first-payment month. Negative principal means the debt grew.`;
}
function exportCSV() {
  if (!baseline) return;
  const fields = ['month', 'date', 'salary', 'budget', 'opening', 'contractual', 'regular', 'extra', 'bonus', 'prepayment', 'payment', 'interest', 'principal', 'balance', 'realPayment', 'realBalance', 'shortfall', 'belowMinimum'];
  const csv = ['Ruang mortgage projection — monthly detail', `Payment strategy,${config.strategy}`, `First payment month,${config.startDate}`, `Annual raise calendar month,${config.raiseMonth}`, `Paid off,${current.paidOff}`, `Remaining balance IDR,${current.balance.toFixed(2)}`, `Balance at contractual maturity IDR,${current.maturityBalance.toFixed(2)}`, `Principal IDR,${config.principal}`, `Annual nominal interest percent,${config.interest}`, `Contract years,${config.years}`, `Net monthly salary IDR,${config.salary}`, `Annual salary growth percent,${config.growth}`, `Salary allocation percent,${config.allocation}`, `Annual inflation percent,${config.inflation}`, `Annual bonus salary months,${config.bonus}`, `Bonus allocation percent,${config.bonusAllocation}`, `Bonus calendar month,${config.bonusMonth}`, 'All currency values IDR; real values in loan-start purchasing power', '', fields.join(','), ...current.rows.map(r => fields.map(k => ['month','date'].includes(k) ? r[k] : r[k].toFixed(2)).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'ruang-mortgage-schedule.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('settings').addEventListener('submit', e => e.preventDefault());
$('settings').addEventListener('input', () => { $('saveStatus').textContent = 'Unsaved changes. Save to keep these settings on this device.'; render(); });
$('addPrepayment').onclick = () => { if (document.querySelectorAll('.prepayment').length < 100) { addPrepayment(); render(); } };
$('valueBasis').onchange = () => { renderChart(); renderSchedule(); };
$('chartMonth').oninput = renderChart;
$('pin').onclick = () => { if (baseline && pins.length < 2) { pins.push({ id: ++pinCounter, config: JSON.parse(JSON.stringify(config)) }); renderComparison(); $('saveStatus').textContent = 'Snapshot pinned. Save settings to keep it on this device.'; } };
$('export').onclick = exportCSV;
$('prev').onclick = () => { page--; renderSchedule(); };
$('next').onclick = () => { page++; renderSchedule(); };
for (const view of ['monthly', 'yearly']) $(view).onclick = () => { interval = view; page = 0; $('monthly').setAttribute('aria-pressed', String(view === 'monthly')); $('yearly').setAttribute('aria-pressed', String(view === 'yearly')); renderSchedule(); };
$('theme').onchange = () => { theme($('theme').value); $('saveStatus').textContent = 'Theme updated. Save settings to remember your choice.'; };
$('save').onclick = () => { if (!baseline) { $('saveStatus').textContent = 'Fix the highlighted inputs before saving.'; return; } try { localStorage.setItem(storageKey, JSON.stringify({ version: 2, config, pins, theme: $('theme').value })); $('saveStatus').textContent = 'Saved on this device. Settings will load next time.'; } catch { $('saveStatus').textContent = 'Browser storage is unavailable. You can still use the calculator and export CSV.'; } };
$('reset').onclick = () => { fill(Mortgage.defaults); pins = []; pinCounter = 0; $('theme').value = 'auto'; theme('auto'); render(); try { localStorage.removeItem(storageKey); localStorage.removeItem('ruang-mortgage-v1'); $('saveStatus').textContent = 'Defaults restored. Saved settings cleared on this device.'; } catch { $('saveStatus').textContent = 'Defaults restored. Browser storage could not be cleared.'; } };
keys.filter(k => !['years', 'bonusMonth', 'raiseMonth', 'startDate', 'strategy'].includes(k)).forEach(k => { $(k).step = 'any'; });
for (const id of ['raiseMonth','bonusMonth']) {
  for (let i=1;i<=12;i++) { const opt=document.createElement('option'); opt.value=i; opt.textContent=new Intl.DateTimeFormat('en-GB',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,i-1,1))); $(id).append(opt); }
}
fill(Mortgage.defaults);
try {
  const raw = localStorage.getItem(storageKey);
  if (!raw && localStorage.getItem('ruang-mortgage-v1')) $('saveStatus').textContent = 'Payment rules have changed. Defaults are shown; your old saved data is retained until you reset. Please enter and save your preferred dates and plan.';
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved.version !== 2 || !saved.config || Mortgage.validate(saved.config).length) throw new Error('Invalid saved configuration');
    fill(saved.config);
    pins = (Array.isArray(saved.pins) ? saved.pins : []).filter(p => p && Number.isSafeInteger(p.id) && p.id > 0 && p.config && !Mortgage.validate(p.config).length).slice(0, 2);
    pinCounter = Math.max(0, ...pins.map(p => p.id));
    $('theme').value = ['auto', 'light', 'dark'].includes(saved.theme) ? saved.theme : 'auto'; theme($('theme').value);
    $('saveStatus').textContent = 'Your saved settings have been restored.';
  }
} catch { $('saveStatus').textContent = 'Saved settings could not be loaded. Defaults are shown; browser storage may be unavailable.'; }
render();
