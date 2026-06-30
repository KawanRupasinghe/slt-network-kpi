Given prompt:
under platform section - in tower maintainance {Proper maintaining and cleaning of tower sites, access roads, tower leg bases and guy bases, Visual inspection of tower condition, aviation lighting system, etc., Measure earth readings and inspect Earthing system}, in routine maintainance {MSAN Data Table, VPN Data Table, SLBN Data Table}, in other KPI {O&M of Power & Air Conditioning}

inside the "{ } " is given the ui table name in each page that is of concern. i need to add a small box with tick icon on the right bottom of each cell where the values fetched from the DB is shown. these box should be slight opac green if value is "1" and if "0" slight opac red

in the conern table for each entity i need a boolen field introduced to enter 1 or 0, default is 0

ask questions if not clear

---
## Q & A:

Tower Maintenance (tm-activity-plan) — The 3 sub-tables show Distribution and Achievement cells per region per month. Which cells exactly? Every Distribution/Achievement cell? Or the summary # Towers row?

ans - in the 3 sub tables for every distribution and achievment cells, same for the routine maintainence page.

O&M of Power & AC — Each cell shows Cum. Sched or Cum. Achieved. Which ones need the indicator? Both? Or just Cum. Achieved?

ans - need in both  Cum. Sched or Cum. Achieved

For TowerMtcData / MsanMtcData / SlbnMtcData / PowerAndAC: is it one IsVerified boolean per row (per designation + month + year combination)? That's what I'd assume.

ans - you assumed correct

For TowerMtcData / MsanMtcData / SlbnMtcData / PowerAndAC: is it one IsVerified boolean per row (per designation + month + year combination)? That's what I'd assume.

ans - i think yes. for every record in each sub table there should be the boolean icon for fields distribution and achiviement

Who can set the boolean? Is it editable from the platform view (inline toggle) or only via the admin data-entry pages?

ans - these values are direclty entered to the DB and fetched, so the default should be 0 in boolean field. which mean it will show a red symbol icon box. when clicked on this red icon / box it will become green [which mean edits the db value to 1] if clicked again turn red

---

## new improvments to be made

dont put the icon for both column Cum. Sched or Cum. Achieved in O&M of Power & Air Conditioning, only put it in Cum.Achieved
in Tower Maintenance - only put it in achievement column in all 3 sub tables
in routine maintainance - only put it in achievement column in all 3 sub tables

the icon / box button should be a small box / ractangle shape button on the right bottom corner of the cell. the ui purporse is it indicate a value is approved or not