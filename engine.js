/* Pure amortization engine. Currency is calculated at full precision, displayed rounded. */
(function (root) {
  'use strict';
  const defaults = { principal: 1000000000, salary: 20000000, growth: 9, interest: 5, allocation: 35, years: 20, inflation: 3, bonus: 0, bonusAllocation: 100, bonusMonth: 12, prepayments: [] };
  function minimumPayment(principal, annualRate, months) {
    const r = annualRate / 1200;
    return r === 0 ? principal / months : principal * r / (-Math.expm1(-months * Math.log1p(r)));
  }
  function validate(c) {
    const errors = [];
    if (!c || typeof c !== 'object') return ['Settings must be an object.'];
    const ranges = { principal: [1, 1e15], salary: [0, 1e12], growth: [-50, 100], interest: [0, 100], allocation: [0, 100], years: [1, 50], inflation: [-20, 100], bonus: [0, 24], bonusAllocation: [0, 100], bonusMonth: [1, 12] };
    for (const [key, [min, max]] of Object.entries(ranges)) {
      if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) errors.push(`${key}: enter a number from ${min} to ${max}.`);
    }
    if (!Number.isInteger(c.years)) errors.push('Term must be a whole number of years.');
    if (!Number.isInteger(c.bonusMonth)) errors.push('Bonus month must be a whole number.');
    if (!Array.isArray(c.prepayments) || c.prepayments.length > 100) errors.push('Use at most 100 prepayments.');
    else c.prepayments.forEach((p, i) => {
      if (!p || !Number.isInteger(p.month) || p.month < 1 || p.month > c.years * 12 || !Number.isFinite(p.amount) || p.amount <= 0 || p.amount > 1e15) errors.push(`Prepayment ${i + 1}: use a month within the term and a positive amount up to Rp1,000 trillion.`);
    });
    return errors;
  }
  function calculate(c, accelerated = true) {
    const errors = validate(c);
    if (errors.length) return { errors };
    const months = c.years * 12, r = c.interest / 1200;
    const minimum = minimumPayment(c.principal, c.interest, months);
    let balance = c.principal, totalInterest = 0, totalPaid = 0, realPaid = 0;
    const rows = [];
    for (let month = 1; month <= months && balance > 0.000001; month++) {
      const salary = c.salary * (1 + c.growth / 100) ** Math.floor((month - 1) / 12);
      const budget = salary * c.allocation / 100;
      const opening = balance, interest = opening * r;
      const due = opening + interest;
      const contractual = Math.min(minimum, due);
      const regular = Math.min(accelerated ? Math.max(minimum, budget) : minimum, due);
      const plannedBonus = accelerated && (month - 1) % 12 + 1 === c.bonusMonth ? salary * c.bonus * c.bonusAllocation / 100 : 0;
      const plannedPrepayment = accelerated ? c.prepayments.filter(p => p.month === month).reduce((s, p) => s + p.amount, 0) : 0;
      const bonus = Math.min(plannedBonus, Math.max(0, due - regular));
      const prepayment = Math.min(plannedPrepayment, Math.max(0, due - regular - bonus));
      const payment = regular + bonus + prepayment;
      const principal = payment - interest;
      balance = Math.max(0, opening - principal);
      if (balance < 0.000001) balance = 0;
      const discount = (1 + c.inflation / 100) ** (month / 12);
      totalInterest += interest; totalPaid += payment; realPaid += payment / discount;
      rows.push({ month, salary, budget, opening, contractual, regular, extra: regular - contractual, bonus, prepayment, payment, interest, principal, balance, realBalance: balance / discount, realPayment: payment / discount, shortfall: Math.max(0, contractual - budget) });
    }
    return { errors: [], minimum, rows, months: rows.length, totalInterest, totalPaid, realPaid, balance, shortfallMonths: rows.filter(r => r.shortfall > 0.01).length };
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
  const api = { defaults, minimumPayment, validate, calculate, yearly };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Mortgage = api;
})(typeof window !== 'undefined' ? window : globalThis);
