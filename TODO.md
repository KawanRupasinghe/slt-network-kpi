# TODO - Strategic KPI Management UI refactor (final-table)

- [x] Confirm current `final-table.component.html` structure and required replacements.
- [x] Apply HTML refactor to match standard admin layout:
  - replace `.kpi-page` -> `.page-container`
  - replace `.kpi-hero` -> `.page-header` and remove eyebrow paragraph
  - wrap content in `.dashboard-container`
  - convert form section to `.form-container` with `.form-header`
  - replace `.field-grid` -> `.form-row`
  - replace `.actions` -> `.form-actions` and button classes to `.btn-submit` / `.btn-cancel`
  - replace `.table-section` -> `.table-wrapper` + `.table-responsive`
- [x] Apply SCSS refactor for `final-table.component.scss`:
  - remove all obsolete selectors listed (kpi-page, kpi-overlay, kpi-hero, eyebrow, form-section, field-grid, actions, primary-btn, secondary-btn, table-section)
  - add styles for the standard classes (page-container, page-header, dashboard-container, form-container, form-header, form-sub, form-row, form-group, form-actions, btn-submit, btn-cancel, table-wrapper, table-responsive, kpi-table, action-buttons, actions-col, btn-edit, btn-delete, no-data)
  - restyle calculation summary sub-sections to blend with admin theme, preserving all existing summary containers/rows/boxes
  - implement responsive behavior for `.form-row` at max-width 768px
  - ensure table uses horizontal scroll via `.table-wrapper` / `.table-responsive`
- [ ] Validate that no TypeScript/logic/bindings were changed.
- [ ] Run frontend build/lint/tests if available.

