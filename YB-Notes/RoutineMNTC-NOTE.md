# Routine MTNC Note

## Current finding

The `Routine Fix.md` analysis matches the current implementation in `frondend/src/app/components/pages/platform/routine-mtnc/routine-mtnc.component.ts`.

Key bug fixes are already present:

- `maintenanceRows` no longer uses index-based platform assignment. It now resolves platform rows from the routine KPI `platform` field.
- `getTargetMonths()` handles MSAN by selecting the correct half-year window for the chosen month, instead of only allowing June and December.
- `calculatePlaceholderValues()` prefers the selected month entry and falls back to the latest available month in the window that is less than or equal to the selected month.
- The year filter is applied to the platform data fetch endpoints (`fetchMsan`, `fetchVpn`, `fetchSlbn`) and not to the routine KPI definitions, which is correct for static routine rows.

## What this means

The Multi-Platform Maintenance Tables section should now calculate values from the DB tables as intended:

- `msanmtcdata` → MSAN row
- `ipnwmtcdata` → VPN/IPNW row
- `slbnmtcdata` → SLBN row

When the user filters by month and year, the displayed percentages are based on the matching platform data record for that period.

## Suggested verification steps

1. Confirm the actual routine KPI `platform` values in the database match the string matching logic used in the code:
   - `SLBN` → `slbn`
   - `IPNW` / `VPN` → `vpn`
   - `MSAN` / `OLTE` → `msan`

2. Validate the February 2026 example directly against DB rows in `msanmtcdata`, `ipnwmtcdata`, and `slbnmtcdata`.

3. Test the UI for months that are not the final month of the MSAN window (e.g. February, April, August, October) to ensure the fallback logic still uses the correct available cumulative data.

## Small suggestion

If you want stronger safety, consider adding a unit or integration test around:

- `get maintenanceRows()` platform mapping,
- `getTargetMonths()` for `msan`, and
- `calculatePlaceholderValues()` fallback behavior.

That will lock in the fix and prevent regressions.
