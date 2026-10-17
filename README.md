# Ruang — Mortgage planner

A mobile-first mortgage calculator built with vanilla HTML, CSS, and JavaScript. No installation, build, external fonts, CDN, analytics, or API required. All calculations run locally.

## Use it

Open `index.html` in a modern browser. For reliable browser storage behavior, serve the folder over HTTP or deploy it. With Python installed, run `python -m http.server 8080` in this folder and visit http://localhost:8080. Node.js is needed only to run the tests: `node tests.cjs`.

## Included

- Editable principal, salary, annual salary growth, annual nominal interest, allocation, and contract term.
- Fixed contractual minimum plus salary-linked extra repayments; month-by-month reducing balance with capped final payments and early payoff.
- Interactive balance chart: click/tap the chart or use the keyboard-accessible month slider. Switch between nominal and inflation-adjusted values.
- Monthly and yearly schedules, paginated in groups of 12. Yearly final period can be partial.
- Minimum-only comparison, live plan, and up to two pinned scenario snapshots. Snapshot numbers identify saved input sets; remove and re-pin to replace a scenario.
- Full monthly CSV export regardless of the selected table interval, including inputs, contractual/actual payments, extras, balances, shortfalls, and real values. CSV uses numeric IDR amounts with two decimals.
- Explicit Save settings stores inputs, snapshots, and theme in localStorage. Reset restores defaults and clears this application's saved data. No cloud synchronization. Browser/private-mode restrictions may prevent saving; the calculator remains usable.
- Optional annual THR/bonus, a configurable share of that bonus, and up to 100 one-time prepayments.
- System light/dark mode with manual overrides, responsive layout, native form controls, visible keyboard focus, screen-reader table headers and status messages.

## Default assumptions

| Input | Default |
| --- | --- |
| Principal | Rp1,000,000,000 |
| Net monthly salary | Rp20,000,000 |
| Annual salary growth | 9% |
| Annual nominal fixed interest | 5% |
| Salary allocated to payment | 35% |
| Contract term | 20 years |
| Annual inflation | 3% |
| Annual bonus | 0 salary months (disabled) |
| Bonus allocation / timing | 100% / loan-year month 12 |

The first regular payment is Rp7,000,000. The contractual minimum is approximately Rp6,599,557.39. Default accelerated payoff occurs in month 124 (10 years, 4 months), with approximately Rp329,481,338.36 interest, versus Rp583,893,774.12 interest for minimum-only payments. Results are projections, not a lender quote.

## Calculation contract

Let `P` be principal, `r = annual nominal interest / 1200`, and `N = years × 12`. The level contractual installment is `A = P × r / (1 - (1 + r)^(-N))`; at 0% interest, `A = P / N`. The implementation uses `log1p`/`expm1` for numerical stability at small positive rates.

For month `m`, salary is `initial salary × (1 + growth/100)^floor((m-1)/12)`. It steps up in months 13, 25, etc. The salary budget is salary × allocation. Regular payment is `max(A, salary budget)`, capped at the outstanding balance plus current interest. This makes salary allocation a **total regular payment target**, not a percentage added on top of the minimum.

Interest accrues on the opening balance each month. Payments apply at month-end, in this order: regular payment, annual bonus, one-time prepayments. The bonus uses the current loan year's salary, in the chosen 1–12 month within each loan year (not a calendar month). Multiple prepayments in the same month are summed. Payments are capped to avoid overpaying. Extra payments reduce term, not the contractual minimum. Prepayments after payoff are unused and flagged. No fees, insurance, tax, penalty, rate resets, daily accrual, or installment recasting is modeled.

If the salary budget is insufficient, the plan **assumes the shortfall is funded elsewhere** and continues paying the minimum. An explicit warning shows the number of shortfall months and maximum gap. This is not a cash-constrained default model: it does not silently underpay, capitalize unpaid interest, or pretend the minimum is affordable. Invalid inputs suppress the results until corrected.

Today's-rupiah values discount each month-end amount by `(1 + annual inflation/100)^(m/12)`. Total real payments sum individually discounted cash flows. Inflation does not change the nominal mortgage payments. In real-value mode the chart displays real balances, and the schedule adds real payment/balance columns; principal and interest columns remain nominal. Snapshot real totals use each snapshot's inflation assumption.

Calculation uses full floating-point precision, with balances below Rp0.000001 treated as repaid. Display rounds to the nearest rupiah; CSV rounds to two decimals. Lender-specific monthly rounding can produce small differences. Yearly totals sum the unrounded monthly values, so adding displayed rows may differ by a few rupiah.

## Deploy on GitHub Pages

1. Create a GitHub repository and upload the contents of this folder (`index.html` at the repository root).
2. Open repository **Settings → Pages**.
3. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. Open the Pages URL displayed by GitHub after deployment finishes.

All asset links are relative, so project subpaths work. No build workflow is required. `.nojekyll` is included for plain static serving. You can omit `tests.cjs` and this README from a production upload if desired.

## Deploy on Netlify

1. Extract the ZIP first.
2. Use Netlify's manual deployment/upload option and drop the folder containing `index.html`.
3. Open the deployment URL after upload completes.

For Git-connected deployment, set the publish directory to the folder containing `index.html` (`.` if at repository root), and leave the build command empty. No environment variables or dependencies are needed.

## Files and testing

- `index.html`: accessible page structure and input controls.
- `styles.css`: responsive layout and themes.
- `engine.js`: pure amortization engine, shared by browser and tests.
- `app.js`: chart, rendering, comparison, storage, CSV, UI events.
- `tests.cjs`: Node built-in assertions, including annuity benchmarks, salary timing, zero interest, shortfall behavior, bonus timing, prepayments, payoff capping, inflation, validation, aggregation, and accounting invariants over 300 deterministic scenarios.

Run `node tests.cjs`. There is no dependency installation step.
