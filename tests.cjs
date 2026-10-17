'use strict';
const assert = require('node:assert/strict');
const M = require('./engine.js');
let passed = 0;
function test(name, fn) { fn(); console.log(`PASS ${name}`); passed++; }
const near = (a, b, tolerance = .01) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const c = overrides => ({ ...M.defaults, prepayments: [], ...overrides });
test('Known 20-year annuity benchmark', () => near(M.minimumPayment(1e9, 5, 240), 6599557.392166573));
test('Minimum-only amortizes in exactly 240 months', () => { const r = M.calculate(c({}), false); assert.equal(r.months, 240); near(r.balance, 0); near(r.totalInterest, 583893774.119978); near(r.totalPaid, r.minimum * 240); });
test('Default accelerated benchmark and salary anniversary', () => { const r = M.calculate(c({})); assert.equal(r.months, 124); near(r.totalInterest, 329481338.3568311); near(r.rows[0].regular, 7e6); near(r.rows[11].salary, 20e6); near(r.rows[12].salary, 21.8e6); assert.equal(r.shortfallMonths, 0); });
test('Zero interest and exact equal payments', () => { const r = M.calculate(c({ principal: 1200, interest: 0, years: 1, salary: 0, allocation: 0 })); near(r.minimum, 100); assert.equal(r.months, 12); near(r.totalInterest, 0); near(r.totalPaid, 1200); });
test('Early payoff caps payment at debt plus accrued interest', () => { const r = M.calculate(c({ principal: 1000, salary: 100000, allocation: 100 })); assert.equal(r.months, 1); near(r.totalPaid, 1000 * (1 + 5 / 1200)); near(r.balance, 0); });
test('Shortfall remains visible; minimum paid from external funds', () => { const r = M.calculate(c({ salary: 0, allocation: 0 })); assert.equal(r.shortfallMonths, 240); near(r.rows[0].shortfall, r.minimum); near(r.rows[0].regular, r.minimum); });
test('Bonus repeats in selected loan-year month with growing salary', () => { const r = M.calculate(c({ bonus: 1, bonusAllocation: 50, bonusMonth: 3 })); near(r.rows[2].bonus, 1e7); near(r.rows[14].bonus, 10.9e6); near(r.rows[1].bonus, 0); });
test('Multiple prepayments in one month add; unused amounts capped', () => { const r = M.calculate(c({ prepayments: [{ month: 1, amount: 1e7 }, { month: 1, amount: 2e7 }, { month: 2, amount: 1e12 }] })); near(r.rows[0].prepayment, 3e7); assert.equal(r.months, 2); near(r.balance, 0); assert.ok(r.rows[1].prepayment < 1e12); });
test('Zero inflation preserves payments; positive inflation discounts', () => { const r = M.calculate(c({ inflation: 0 })); near(r.realPaid, r.totalPaid); const d = M.calculate(c({ inflation: 10 })); assert.ok(d.realPaid < d.totalPaid); near(d.rows[11].realPayment, d.rows[11].payment / 1.1); });
test('Negative salary growth and deflation remain valid', () => { const r = M.calculate(c({ growth: -10, inflation: -2 })); assert.equal(r.errors.length, 0); assert.ok(r.shortfallMonths > 0); assert.ok(r.realPaid > r.totalPaid); });
test('Invalid and nonfinite input is rejected', () => { for (const bad of [{ principal: 0 }, { interest: -1 }, { years: 1.5 }, { salary: NaN }, { allocation: 101 }, { bonusMonth: 0 }, { inflation: Infinity }, { prepayments: [null] }, { prepayments: [{ month: 241, amount: 1 }] }, { prepayments: [{ month: 1, amount: -1 }] }]) assert.ok(M.calculate(c(bad)).errors.length); assert.ok(M.validate(null).length); });
test('Yearly aggregation includes partial final year', () => { const r = M.calculate(c({})); const y = M.yearly(r.rows); assert.equal(y.length, 11); near(y.reduce((s, x) => s + x.payment, 0), r.totalPaid); near(y.reduce((s, x) => s + x.interest, 0), r.totalInterest); near(y.at(-1).balance, 0); });
test('Accounting invariants over 300 reproducible combinations', () => {
  let seed = 42; const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 300; i++) {
    const r = M.calculate(c({ principal: 1e6 + rand() * 2e9, salary: rand() * 5e7, interest: rand() * 25, years: 1 + Math.floor(rand() * 40), growth: -10 + rand() * 30, allocation: rand() * 100, bonus: rand() * 2 }));
    assert.equal(r.errors.length, 0); near(r.balance, 0); assert.ok(r.months <= 480);
    near(r.rows.reduce((s, row) => s + row.principal, 0), r.rows[0].opening);
    near(r.totalPaid, r.rows[0].opening + r.totalInterest);
    for (const row of r.rows) { assert.ok(row.balance >= 0); assert.ok(row.principal > 0); near(row.payment, row.regular + row.bonus + row.prepayment); near(row.opening - row.principal, row.balance); }
  }
});
console.log(`\n${passed} tests passed.`);
