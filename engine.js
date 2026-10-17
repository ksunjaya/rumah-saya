/* Pure amortization engine. Currency is calculated at full precision, displayed rounded. */
(function (root) {
  'use strict';
  const defaults = { principal: 1000000000, salary: 20000000, growth: 9, interest: 5, allocation: 35, years: 20, inflation: 3, bonus: 0, bonusAllocation: 100, bonusMonth: 12, startDate: '2026-10', raiseMonth: 1, strategy: 'budget', prepayments: [] };
  function dateAt(start, offset) {
    const [year, month] = start.split('-').map(Number);
    const index = year * 12 + month - 1 + offset;
    return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  }
  function monthIndex(start, date) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(date)) return NaN;
    const [sy, sm] = start.split('-').map(Number), [y, m] = date.split('-').map(Number);
    return (y - sy) * 12 + m - sm + 1;
  }
  function minimumPayment(principal, annualRate, months) {
    const r = annualRate / 1200;
    return r === 0 ? principal / months : principal * r / (-Math.expm1(-months * Math.log1p(r)));
  }
  function validate(c) {
    const errors = [];
    if (!c || typeof c !== 'object') return ['Settings must be an object.'];
    const ranges = { principal: [1, 1e15], salary: [0, 1e12], growth: [-50, 100], interest: [0, 100], allocation: [0, 100], years: [1, 50], inflation: [-20, 100], bonus: [0, 24], bonusAllocation: [0, 100], bonusMonth: [1, 12], raiseMonth: [1, 12] };
    for (const [key, [min, max]] of Object.entries(ranges)) {
      if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) errors.push(`${key}: enter a number from ${min} to ${max}.`);
    }
    if (!Number.isInteger(c.years)) errors.push('Term must be a whole number of years.');
    if (!Number.isInteger(c.bonusMonth)) errors.push('Bonus month must be a whole number.');
    if (!Number.isInteger(c.raiseMonth)) errors.push('Raise month must be a whole number.');
    if (typeof c.startDate !== 'string' || !/^(19\d{2}|20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/.test(c.startDate)) errors.push('Choose a first payment month between 1900 and 2200.');
    if (!['budget', 'contract'].includes(c.strategy)) errors.push('Choose a payment plan.');
    if (!Array.isArray(c.prepayments) || c.prepayments.length > 100) errors.push('Use at most 100 prepayments.');
    else c.prepayments.forEach((p, i) => {
      if (!p || !Number.isInteger(p.month) || p.month < 1 || p.month > 600 || !Number.isFinite(p.amount) || p.amount <= 0 || p.amount > 1e15) errors.push(`Prepayment ${i + 1}: choose a date within the 50-year projection and a positive amount up to Rp1,000 trillion.`);
    });
    return errors;
  }
  function calculate(c, accelerated = true) {
    const errors = validate(c);
    if (errors.length) return { errors };
    const months = c.years * 12, r = c.interest / 1200;
    const minimum = minimumPayment(c.principal, c.interest, months);
    let balance = c.principal, totalInterest = 0, totalPaid = 0, realPaid = 0;
    const rows = [], horizon = accelerated && c.strategy === 'budget' ? 600 : months;
    let salary = c.salary;
    for (let month = 1; month <= horizon && balance > 0.000001; month++) {
      const date = dateAt(c.startDate, month - 1), calendarMonth = Number(date.slice(5));
      if (month > 1 && calendarMonth === c.raiseMonth) salary *= 1 + c.growth / 100;
      const budget = salary * c.allocation / 100;
      const opening = balance, interest = opening * r;
      const due = opening + interest;
      const contractual = Math.min(minimum, due);
      const regular = Math.min(accelerated && c.strategy === 'budget' ? budget : minimum, due);
      const plannedBonus = accelerated && calendarMonth === c.bonusMonth ? salary * c.bonus * c.bonusAllocation / 100 : 0;
      const plannedPrepayment = accelerated ? c.prepayments.filter(p => p.month === month).reduce((s, p) => s + p.amount, 0) : 0;
      const bonus = Math.min(plannedBonus, Math.max(0, due - regular));
      const prepayment = Math.min(plannedPrepayment, Math.max(0, due - regular - bonus));
      const payment = regular + bonus + prepayment;
      const principal = payment - interest;
      balance = Math.max(0, opening - principal);
      if (balance < 0.000001) balance = 0;
      const discount = (1 + c.inflation / 100) ** (month / 12);
      totalInterest += interest; totalPaid += payment; realPaid += payment / discount;
      rows.push({ month, date, salary, budget, opening, contractual, regular, extra: Math.max(0, regular - contractual), bonus, prepayment, payment, interest, principal, balance, realBalance: balance / discount, realPayment: payment / discount, shortfall: Math.max(0, contractual - budget), belowMinimum: month <= months ? Math.max(0, contractual - payment) : 0 });
    }
    const paidOff = balance === 0;
    return { errors: [], minimum, rows, months: rows.length, totalInterest, totalPaid, realPaid, balance, paidOff, maturityBalance: rows[months - 1]?.balance || 0, maturityDate: dateAt(c.startDate, months - 1), payoffDate: paidOff ? rows.at(-1).date : null, belowMinimumMonths: rows.filter(r => r.belowMinimum > .01).length, growingMonths: rows.filter(r => r.principal < -.01).length, shortfallMonths: rows.filter(r => r.shortfall > 0.01).length };
  }
  function yearly(rows) {
    const groups = [];
    rows.forEach(r => {
      const index = Math.floor((r.month - 1) / 12);
      if (!groups[index]) groups[index] = { month: index + 1, payment: 0, interest: 0, principal: 0, extra: 0, bonus: 0, prepayment: 0, realPayment: 0, balance: 0, realBalance: 0 };
      const g = groups[index];
      for (const key of ['payment', 'interest', 'principal', 'extra', 'bonus', 'prepayment', 'realPayment']) g[key] += r[key];
      g.balance = r.balance; g.realBalance = r.realBalance;
    });
    return groups;
  }
  const api = { defaults, dateAt, monthIndex, minimumPayment, validate, calculate, yearly };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Mortgage = api;
})(typeof window !== 'undefined' ? window : globalThis);
