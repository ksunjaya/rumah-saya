# Ruang — Mortgage planner, version 3

## Version 3: sale shares, Excel and Indonesian contract PDF

The **Your share of the sale** section models a family loan with no down payment. At each month-end, the borrower's economic share is original principal actually repaid divided by the original loan. The creditor's share is the remainder. Paid interest stays with the creditor and does not increase the borrower's share. This is an agreed distribution of sale proceeds, not a land-title transfer.

Enter the gross sale price and selling costs in whole rupiah. Costs are deducted first; the remaining proceeds are split by the percentages. Sale payouts are rounded to whole rupiah, with the creditor receiving the remaining amount so the payouts sum exactly to net proceeds. The same sale estimate is used as an alternative hypothetical sale in each month, not as repeated sales. Actual settlement must use actual payments and documented costs.

**Agreed full settlement:** after the sale completes and the shares are paid, all debt is settled, even if the creditor receives less than the remaining balance. The balance is not deducted again before splitting. If the creditor's share is greater than the balance, it remains their agreed share. Future interest stops at sale. Previously paid interest stays with the creditor.

For underpayments, an explicit ledger tracks paid interest and unpaid interest. Payments cover prior unpaid interest and current interest before reducing original principal. Repaying capitalized interest does not accidentally count as buying more of the original principal. Initial shares are 0% borrower and 100% creditor; at full repayment they become 100% and 0%.

**Download Excel (.xlsx)** produces a real workbook with assumptions, every projected month, and one-time prepayments. Percentages are numeric Excel percentage cells. The monthly data includes principal, accrued/paid/unpaid interest, cumulative original principal and paid interest, balances, both shares, and hypothetical sale proceeds. Existing CSV export now includes these columns too, while preserving salary, affordability and inflation-adjusted data.

**Contract details & PDF** generates an Indonesian draft family-loan agreement, editable party/property details, the full-settlement sale clause, assumptions and a complete monthly schedule. Headers repeat on every schedule page. All rows export, regardless of table pagination or selected sale month. The PDF is marked DRAFT and projected figures are explicitly not payment receipts. Blank identities and unresolved clauses remain placeholders. Legal review is needed before use, especially for repayment below the reference installment, interest capitalization, land formalities and security. This generator does not sign or register any agreement.

Legal drafting background: Indonesian official explanations of agreement requirements and binding agreed terms: [Mahkamah Agung](https://jdih.mahkamahagung.go.id/index.php/tulisan-hukum-detail/dilema-perjanjian-yang-dapat-dibatalkan-dan-batal-demi-hukum-02t) and [DJKN, Ministry of Finance](https://www.djkn.kemenkeu.go.id/artikel/baca/15872/Mau-Bikin-Perjanjian-Yuk-Simak-Hal-Hal-Apa-Saja-yang-Harus-Dipenuhi). These explain general principles; they are not approval of this generated agreement.

Privacy: documents are created on your device. No OpenAI token, API, CDN or document-upload service is used. The required MIT-licensed JSZip and pdf-lib browser bundles and their licenses are included in `vendor/`; keep that folder in any deployment. Identity/property text is held only in the current tab and the downloaded PDF; it is not added to localStorage. Save settings remembers the sale-price/cost estimate and selected sale month along with existing settings.

Additional source files: `documents.js` (pure export and sale calculations), `sale-ui.js` (sale and document controls), and `sale-tests.cjs` (formulas, paid-interest ledger, allocation rounding, spreadsheet structure, settlement clause and 600-month PDF stress test).

Run `node sale-tests.cjs` alongside the other tests below. `node sale-tests.cjs --samples` creates an illustrative PDF/XLSX/CSV in a sibling `outputs/` folder. Samples use the default mortgage and a Rp1.2 billion sale with Rp50 million selling costs; these are examples, not your agreed price.

Verification: all calculation and simulated UI checks passed, generated Excel was independently reopened with openpyxl, generated PDF text was checked with pypdf and representative PDF pages were rendered for visual inspection. Browser layout remains unverified because the local preview browser could not connect.

A responsive, standalone HTML/CSS/JavaScript calculator. Extract this folder and open index.html. No build, installation, remote libraries, account, or API required. For dependable localStorage behavior, use a static HTTP server or deploy the folder.

## Choose how you want to pay

**Use only my salary allocation (default):** regular payments are exactly net salary × allocation, capped at the debt owed. No automatic top-ups. Optional bonus and one-time payments are additional. The projection continues beyond the chosen contract term, up to 600 months (50 years), to find the actual payoff date. It shows the outstanding balance at contractual maturity. If still unpaid after 50 years, totals are explicitly partial; no payoff or interest-saving claim is made.

**Stay on the contract schedule:** regular payments equal the contractual installment. Salary growth does not automatically accelerate repayment. Allocation is only an affordability check. With no extras, the loan lasts the selected term. Optional extras can still shorten it.

The minimum-only comparison always pays the contractual installment without extras.

Below-installment payments are flagged separately from the projected payoff date. A salary-budget projection assumes the lender allows its payment pattern, including interest capitalization when payments do not cover interest. It does not represent an approved contract, model default or arrears charges, or assume later payments cure missed installments. A zero balance by maturity does not mean every earlier installment was met. Contract mode clearly identifies when the installment exceeds the salary allocation.

## Dates and one-time payments

- Loan start is the first payment month and year, not the disbursement date. Interest for a full first month is assumed; payments occur at month-end.
- Enter the net salary received in that first payment month. The annual raise applies in the selected calendar month, beginning with the next occurrence strictly after the first payment month. If the raise month equals the starting month, the first raise is 12 months later.
- Annual THR/bonus uses a calendar month and that month's salary (including any raise that month). A bonus in the first payment month is included.
- A one-time extra payment is a single lump sum on top of regular payments, such as Rp50 million from savings. Choose its calendar month/year. It is applied after interest and the regular/bonus payments. Multiple extras on one date add together; amounts are capped at remaining debt. Extras after payoff are unused and flagged.
- Changing the start date preserves dates already entered for one-time payments. Dates before the start or beyond the 50-year projection are invalid.
- Monthly schedules and exports show actual dates. Yearly tables group 12 payments from the loan's start month, not January–December; the final group may be partial.

## Defaults

Principal Rp1 billion; net salary Rp20 million/month; salary growth 9% annually; nominal fixed interest 5% annually; salary allocation 35%; contractual term 20 years; inflation 3%; bonus disabled. Example first payment is October 2026 and annual raise month is January. Both are editable, and these dates affect the result.

## Calculation and display

Monthly interest rate is annual nominal interest / 1200. The contract installment is P × r / (1 − (1+r)^(-N)); at zero interest, P / N. Interest uses the opening balance. Regular payment, bonus, and extra payments follow in that order. No fees, insurance, taxes, rate resets, daily accrual, or prepayment penalties are included; extra payments reduce duration without recasting the installment.

Today's-rupiah values discount each month-end payment/balance by (1 + annual inflation/100)^(month/12). Total real payments sum the discounted monthly payments. The real chart uses discounted balances; real table columns are added alongside nominal figures. Inflation does not change nominal payments. Each saved comparison uses its own assumptions.

Calculations retain floating-point precision; balances below Rp0.000001 are treated as zero. Display rounds to Rp1; CSV amounts use two decimal places. Lender-specific rounding may differ. Negative principal in a schedule means payments failed to cover interest and the balance grew.

The chart can be tapped or explored using its keyboard-accessible month slider. It extends to the later of contractual maturity and the budget projection end, showing increasing balances where applicable. CSV always contains the full monthly projection, strategy, dates, unpaid status, maturity balance, and real values. Compare up to two pinned snapshots alongside the current plan and minimum-only baseline.

## Saved settings

Save settings stores inputs, snapshots, and theme on this browser/device. Version 2 uses a new storage key because payment rules changed. Earlier saved data is not silently reinterpreted: a notice asks you to enter dates and the desired plan. Old data remains until Reset. Reset clears both versions and restores defaults. Browser restrictions may block localStorage; calculations and CSV remain available.

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

index.html, styles.css, engine.js, and app.js are the website. The engine is shared with the Node tests. All tests use built-in Node modules; no installation is needed.

Run:

    node tests.cjs
    node dates-tests.cjs
    node ui-smoke.cjs

Coverage includes 13 core tests, accounting invariants over 300 deterministic scenarios, 7 calendar/strategy regression groups, and a lightweight simulated-DOM UI wiring check (initial rendering, switching plans, unpaid state, CSV, validation, reset, snapshots, save, schedule, and inflation). The UI smoke test is not a real browser or visual layout test. Browser visual QA remains unverified because the local preview browser could not connect in the authoring environment.
