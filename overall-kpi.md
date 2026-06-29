# Overall KPI Documentation

## 01 - Implemented Logic on Routine MTNC Page

### What is implemented
- The Routine MTNC page now maps each platform to its correct maintenance source data:
  - `SLBN` uses `slbnmtcdata`
  - `MSAN` uses `msanmtcdata`
  - `IPNW` uses `ipnwmtcdata`
- The top summary table continues to show the multi-platform maintenance scores and uses the current selected month/year filters.
- Routine rows are displayed based on the platform mapping from `routine.platform` values to normalized platform keys, not by row index.

### How mapping is done
- The frontend `maintenanceRows` getter normalizes each routine row's `platform` string by lowercasing and removing spaces/ampersands.
- It then matches known platform names to keys:
  - patterns containing `slbn`, `bbanw`, or `slb` map to `slbn`
  - patterns containing `ipnw` or `vpn` map to `vpn`
  - patterns containing `msan`, `olte`, `int`, or `nt` map to `msan`
- That `platformKey` selects which platform dataset to use for the row when rendering values and detail columns.

### How the DB is called
- On component init, the frontend calls `fetchData()` and sends 4 HTTP requests in parallel:
  - `/api/multi-table/fetchMsan?year={selectedYear}`
  - `/api/multi-table/fetchVpn?year={selectedYear}`
  - `/api/multi-table/fetchSlbn?year={selectedYear}`
  - `/api/mtnc-routine`
- Each platform endpoint returns a list of `PlatformRecord` objects grouped by normalized month name.
- The backend `MultiTableService` queries the appropriate DbSet and filters by year:
  - `MsanMtcData` for MSAN
  - `IpnwMtcData` for IPNW/VPN
  - `SlbnMtcData` for SLBN
- The year filter is applied with `Where(x => year == null || x.Year == year)` before projection.

### How data is grouped and normalized
- Each platform fetch method selects raw rows into a `CumulativeRow` projection with:
  - `Designation`, `Month`, `CumulativeSched`, `CumulativeAchieved`
- `GroupToPlatformRecords(rows)` groups rows by normalized month string using `NormalizeMonth(rawMonth)`.
- `NormalizeMonth()` converts numeric month values or date strings into full month names like `January`, `February`, etc.
- Each group becomes one `PlatformRecord` with a `Month` and a `Data` dictionary keyed by `Designation`.
- `Column2` is set to `CumulativeSched`, and `Column3` is set to `CumulativeAchieved` for each designation.

### How month/year filtering works
- The backend returns all rows for the selected year; the frontend applies month selection when calculating display values.
- The selected year is only used in the API URL query for the platform data endpoints.
- The selected month is used in `calculatePlaceholderValues()` to choose the target month record from the returned dataset.
- For each platform:
  - `MSAN` uses a half-year window: January–June if selected month is 1–6, July–December if selected month is 7–12.
  - `VPN` and `SLBN` use a two-month window: `[Jan,Feb]`, `[Mar,Apr]`, `[May,Jun]`, `[Jul,Aug]`, `[Sep,Oct]`, or `[Nov,Dec]` based on the selected month.
- The component first looks for an exact month match in `data.find(d => d.month === selectedMonthLabel)`.
- If there is no exact match, it falls back to the latest available month in the selected window that is on or before the selected month.

### How values are calculated and displayed
- Once the target `PlatformRecord` is selected, `applyCumulativePercentage()` computes values for every expected KPI column.
- For each designation column:
  - `cumSched = Number(detail?.column2) || 0`
  - `cumAchieved = Number(detail?.column3) || 0`
  - `percent = cumSched ? ((cumAchieved / cumSched) * 100).toFixed(2) : '0.00'`
- The result is stored in `placeholderMap[platformKey][column]` and rendered in the UI with `%` appended.

### Sorting and row order
- `MtncRoutineController.GetAll()` returns routine definitions ordered by `No`.
- The UI `maintenanceRows` getter preserves that order and attaches a platform key to each row.
- Display order in the table is therefore driven by the routine definition order, not by the platform dataset.

### Backend alignment
- Backend services return the correct platform-specific row groups:
  - `MultiTableController.FetchMsan()` returns grouped `MsanMtcData` months.
  - `MultiTableController.FetchVpn()` returns grouped `IpnwMtcData` months.
  - `MultiTableController.FetchSlbn()` returns grouped `SlbnMtcData` months.
- `MtncRoutineController.GetAll()` returns routine definitions ordered by `No`.
- The `No` value shown in the UI is sourced from `MtncRoutine.No` and should reflect the database value as returned by the API.

## 02 - To Be Implemented for Overall KPI

### Objective
Implement overall KPI calculations for engineers using defined KPI weightages and node-based points allocation.

### Core logic to implement
1. Load KPI definitions from `KpiDefinition`.
   - Use fields: `Weightage`, `PointsApplicable`, `TotalPoints`.
   - The base point pool is derived as `90000 * weightage` for each KPI.
2. Determine each engineer's assigned node share.
   - Calculate the engineer’s assigned nodes for the target month.
   - Determine total nodes for the month from the sum of cumulative scheduled counts across all engineers or all relevant nodes.
3. Calculate achieved KPI percentage for each engineer.
   - Use the achieved value versus target value for the KPI.
   - The result should be expressed as a percent achievement for that engineer in the selected period.
4. Allocate points achieved.
   - For each KPI: `points achievable = 90000 * weightage`
   - For each engineer: `points achieved = (assigned node share / total nodes) * points achievable`
   - If a KPI also requires scaling by actual performance, multiply by the achieved KPI percent.
5. Sum across KPIs.
   - Total engineer points for the period = sum of each KPI’s points achieved after node share and performance scaling.

### Implementation steps
- Step 1: Confirm KPI definition source and normalization
  - Find `KpiDefinition` values in `finaldatatables`.
  - Verify `Weightage` is expressed as a decimal fraction, and `PointsApplicable` or `TotalPoints` is used consistently.
- Step 2: Build monthly node totals
  - Aggregate the month’s cumulative scheduled nodes across all active engineers.
  - Use the same month/year filter logic as Routine MTNC if the period selection is shared.
- Step 3: Compute engineer node share and raw points
  - For each engineer and KPI, compute `nodeShare = assignedNodes / totalNodes`.
  - Then compute `rawPoints = nodeShare * (90000 * weightage)`.
- Step 4: Apply achieved KPI percentage
  - Compute `adjustedPoints = rawPoints * achievedPercent`.
  - Use a normalized percent value from 0 to 1 if implementation uses fractional scaling.
- Step 5: Persist and return results
  - Store the computed overall KPI results in `OverallKpiResult` or equivalent output table.
  - Expose an API endpoint such as `/api/overall-kpi-results` for the frontend.

### Notes for accurate scoring
- Ensure the point pool uses the defined KPI weightage from `KpiDefinition`.
- Preserve the same month/year filter semantics as the Routine MTNC page when calculating totals.
- The total nodes should reflect scheduled workload for the selected period, not just completed or active nodes.
- If a KPI definition has `PointsApplicable` or `TotalPoints`, verify whether it should cap or scale the `90000 * weightage` pool.
- Clearly label the computed fields in the output:
  - `AssignedNodes`
  - `TotalNodes`
  - `NodeShare`
  - `PointsAchievable`
  - `PointsAchieved`
  - `KpiAchievementPercent`

### Example result shape
- `EngineerId`
- `EngineerName`
- `KpiId`
- `TargetMonth`
- `AssignedNodes`
- `TotalNodes`
- `NodeShare`
- `PointsPossible`
- `PointsAchieved`
- `AchievementPercent`

---

This document captures the implemented Routine MTNC page logic and the next steps for building the overall KPI engineer scoring calculation.