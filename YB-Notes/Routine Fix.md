# Routine MTNC Page — Percentage Calculation Bug Analysis

## Summary

The "Multi-Platform Maintenance Tables" on the Routine MTNC page displays incorrect percentage values for MSAN and SLBN rows. The values are __cross-wired__ — SLBN's percentage appears on MSAN's row, and MSAN's default appears on SLBN's row. IPNW happens to be correct by coincidence of ordering. The root cause is an __index-based platform mapping__ that assumes the routine KPI definitions arrive in a specific order (MSAN, VPN, SLBN), but the actual database order is different (SLBN, IPNW, MSAN). Additionally, the __month-windowing logic__ for MSAN returns an empty array for February, causing a fallback to the default 100.00%, which masks the real cumulative values.

---

## The Bug in Detail

### 1. Platform Mapping Mismatch — The Primary Bug

__File__: `frondend/src/app/components/pages/platform/routine-mtnc/routine-mtnc.component.ts`

__Lines 161–165:__

```typescript
get maintenanceRows(): MaintenanceRow[] {
  return this.routineData.map((routine, index) => ({
    routine,
    platformKey: this.platformConfigs[index]?.key ?? null  // <-- BUG: index-based
  }));
}
```

`platformConfigs` is hardcoded as `[{ key: 'msan', ... }, { key: 'vpn', ... }, { key: 'slbn', ... }]`.

The `routineData` is fetched from the backend __ordered by `No`__. The actual database records have this order (based on the sample output): | No | KPI | Platform field (from DB) | |----|-----|--------------------------| | 1 | Routine maintenance - SLBN (every two months) | SLBN | | 2 | Routine maintenance - IPNW (every two months) | IPNW | | 3 | Routine maintenance - MSAN/OLTE (every six months) | MSAN |

Because of the index mapping:

- Row index 0 (SLBN) → gets `platformConfigs[0]` = `msan` → shows MSAN data
- Row index 1 (IPNW) → gets `platformConfigs[1]` = `vpn` → shows VPN data (IPNW is VPN)
- Row index 2 (MSAN) → gets `platformConfigs[2]` = `slbn` → shows SLBN data

__Effect on percentages for February 2026 NW/WPC-1:__

| Table row | Expected calculation | Expected % | Got from mapped platform | Actual shown % | |-----------|---------------------|------------|--------------------------|----------------| | SLBN row | slbn: 6/2 = __300%__ | 300% | msan → Feb returns empty window → default 100% | 100% | | IPNW row | ipnw: 28/18 = __155.56%__ | 155.56% | vpn/ipnw → correct mapping | 155.56% | | MSAN row | msan: 63/48 = __131.25%__ | 131.25% | slbn → 6/2 = 300% | 300.00% |

### 2. Month Window Logic — MSAN Returns Empty for Non-boundary Months

__File__: `routine-mtnc.component.ts`, lines 348–361

```typescript
private getTargetMonths(platform: PlatformKey): string[] {
  const monthLabel = this.monthOptions.find(m => m.value === this.selectedMonth)?.label ?? '';

  if (platform === 'msan') {
    if (this.selectedMonth === 6)  return MONTH_NAMES.slice(0, 6);   // Jan–Jun
    if (this.selectedMonth === 12) return MONTH_NAMES.slice(6);      // Jul–Dec
    return [];  // <-- ALL OTHER MONTHS RETURN EMPTY!
  }

  // VPN and SLBN: bi-monthly cadence (even months)
  const validMonths = [2, 4, 6, 8, 10, 12];
  if (!validMonths.includes(this.selectedMonth)) return [];

  const idx = MONTH_NAMES.indexOf(monthLabel);
  return [MONTH_NAMES[idx - 1], monthLabel];
}
```

For MSAN with `selectedMonth = 2` (February):

- `this.selectedMonth === 6` → false
- `this.selectedMonth === 12` → false
- Returns `[]`

This causes `calculatePlaceholderValues` to hit the early return at line 321:

```typescript
if (!months.length) return result;  // returns default { all: "100.00" }
```

__The user selected February, but MSAN only produces percentages for June and December.__ For all other months, it falls back to 100.00%. This is a design limitation — the MSAN calc should either:

- Show the cumulative percentage for the most recent completed half-year window relative to the selected month, OR
- Show data for any month by using the cumulative values from the last month in the current half-year that has data up to the selected month.

### 3. Cumulative Calculation Is Correct in Isolation

The actual `(cumAchieved / cumSched) * 100` formula in `calculatePlaceholderValues` (line 328) is using the correct fields (`column2` = `CumulativeSched`, `column3` = `CumulativeAchieved`). No issue there.

### 4. Year Filter Works Correctly

The API calls pass `year=${this.selectedYear}` and the backend filters `x.Year == year`. The client-side year selection feeds into the fetch correctly. No bug in year filtering.

### 5. Detail Tables (MSAN Data Table, VPN Data Table, SLBN Data Table) Appear Correct

The `getDetailValue` method correctly maps `column` → `designation` by case-insensitive trim match, and reads `column2`/`column3` from the API response. These tables are not affected by the mapping bug.

---

## Fix Requirements

### Fix 1: Change `maintenanceRows` to use the routine's platform field

Replace the index-based mapping with a lookup that matches the routine's `platform` field to the correct `platformConfig`:

```typescript
get maintenanceRows(): MaintenanceRow[] {
  return this.routineData.map(routine => {
    const platform = routine.platform?.toLowerCase() || '';
    let platformKey: PlatformKey | null = null;
    if (platform.includes('slbn')) platformKey = 'slbn';
    else if (platform.includes('ipnw') || platform.includes('vpn')) platformKey = 'vpn';
    else if (platform.includes('msan') || platform.includes('olte')) platformKey = 'msan';
    return { routine, platformKey };
  });
}
```

### Fix 2: Handle MSAN for any month

Change `getTargetMonths` for MSAN to find the appropriate half-year window that contains the selected month:

```typescript
if (platform === 'msan') {
  // Use the half-year that contains the selected month
  if (this.selectedMonth >= 1 && this.selectedMonth <= 6) {
    return MONTH_NAMES.slice(0, 6);   // Jan–Jun
  } else {
    return MONTH_NAMES.slice(6);      // Jul–Dec
  }
}
```

### Fix 3: `calculatePlaceholderValues` should use the LAST available month in the window that is ≤ selected month

Currently it uses `lastMonthEntry` by reversing the months array and finding the first match. But if the cumulative window is Jan-Jun and the selected month is February, it should use February's cumulative data (the most recent completed month), not June's. The current reverse-find takes June, which might include data from March-May that hasn't happened yet. Fix:

```typescript
const months = this.getTargetMonths(platform);
if (!months.length) return result;

// Find the entry for the selected month, or the latest month in the window ≤ selected month
const selectedMonthLabel = this.monthOptions.find(m => m.value === this.selectedMonth)?.label ?? '';
const targetEntry = data.find(d => d.month === selectedMonthLabel)
  || months.slice().reverse().map(m => data.find(d => d.month === m)).find(e => e !== undefined);

if (!targetEntry) return result;
```

---

## Files to Fix

| File | Line(s) | Issue | |------|---------|-------| | `frondend/src/app/components/pages/platform/routine-mtnc/routine-mtnc.component.ts` | 161–165 | Index-based `maintenanceRows` mapping causes platform data mismatch | | Same file | 348–361 | `getTargetMonths` returns empty for MSAN on non-June/December months | | Same file | 321 | `calculatePlaceholderValues` early-returns default 100% for empty month window, masking the bug | | Same file | 327 | `lastMonthEntry` uses reverse-find which picks the last month in window (e.g., June) instead of the selected month (February) |

---

## Suggested Reading Order for Fix

1. `routine-mtnc.component.ts` — lines 150–165 (`maintenanceRows` getter) — fix the platform mapping
2. `routine-mtnc.component.ts` — lines 348–361 (`getTargetMonths`) — fix MSAN month logic
3. `routine-mtnc.component.ts` — lines 314–333 (`calculatePlaceholderValues`) — fix month entry selection
4. Verify against DB values: `MsanMtcData`, `SlbnMtcData`, `IpnwMtcData` for February 2026 NW/WPC-1

---

## Verification

After fixes, the Multi-Platform Maintenance Table for February 2026 NW/WPC-1 should show:

| Row | Correct % | Calculation | |-----|-----------|-------------| | Routine maintenance - SLBN (every two months) | 300.00% | 6/2 × 100 | | Routine maintenance - IPNW (every two months) | 155.56% | 28/18 × 100 | | Routine maintenance - MSAN/OLTE (every six months) | 131.25% | 63/48 × 100 |

The detail tables (MSAN Data Table, VPN Data Table, SLBN Data Table) under the Multi-Platform Maintenance Tables header should continue to show correct Distribution & Achievement columns since they bypass the `maintenanceRows` mapping and render directly from `getPlatformRecords()`.