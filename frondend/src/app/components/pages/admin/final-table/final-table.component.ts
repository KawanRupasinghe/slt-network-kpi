/*
 File: final-table.component.ts
 Description: KPI definitions final table management page
 Purpose: CRUD operations for KPI definition setup including weightage calculation.
 Features: KPI definition management, point allocation, metric tracking
*/

import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

/* ========== DATA TYPES ========== */

/* KPI definition entity */
export type KpiDefinition = {
  id: number;
  perspectives: string;
  strategicObjectives: string;
  keyPerformanceIndicators: string;
  unit: string;
  descriptionOfKPI: string;

  // ✅ backend calculated
  weightage: number; // decimal % e.g. 12.3456

  // ✅ user input
  pointsApplicable: number;

  month?: number;
  year?: number;
};

// ✅ REQUEST: remove weightage (backend calculates)
export type UpsertKpiDefinitionRequest = {
  perspectives: string;
  strategicObjectives: string;
  keyPerformanceIndicators: string;
  unit: string;
  descriptionOfKPI: string;

  pointsApplicable: number;

  month: number;
  year: number;
};

@Component({
  selector: 'app-final-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './final-table.component.html',
  styleUrls: ['./final-table.component.scss'],
})
export class FinalTableComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  pageTitle = 'Strategic KPI Management';

  records: KpiDefinition[] = [];
    editingId: number | null = null;

  loading = false;
  saving = false;
  errorMessage = '';

  private readonly apiBase = `${environment.apiUrl}/kpi-definitions`;

  // ✅ weightage is displayed but NOT editable, so keep a disabled control
  form = this.fb.nonNullable.group({
    perspectives: ['', [Validators.required]],
    strategicObjectives: ['', [Validators.required]],
    keyPerformanceIndicators: ['', [Validators.required]],
    unit: ['', [Validators.required]],
    descriptionOfKPI: ['', [Validators.required]],

    // ✅ calculated field (readonly)
    weightage: this.fb.nonNullable.control({ value: 0, disabled: true }),

    // ✅ user input
    pointsApplicable: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http
      .get<KpiDefinition[]>(this.apiBase)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.records = (res ?? []).sort((a, b) => a.id - b.id);

          // ✅ If editing, refresh the displayed weightage from server (after recalculation)
          if (this.editingId) {
            const current = this.records.find((x) => x.id === this.editingId);
            if (current) this.form.controls.weightage.setValue(current.weightage ?? 0);
          }
        },
        error: (err) => {
          console.error('GET /api/kpi-definitions failed:', err);
          this.errorMessage = 'Unable to load KPI definitions.';
          this.records = [];
        },
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    const request$ = this.editingId
      ? this.http.put(`${this.apiBase}/${this.editingId}`, payload)
      : this.http.post(this.apiBase, payload);

    this.saving = true;
    this.errorMessage = '';

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.resetForm();
          this.fetchData();
        },
        error: (err) => {
          console.error('Save failed:', err);
          this.errorMessage = 'Save failed. Check backend validation / API errors.';
        },
      });
  }

  onEdit(record: KpiDefinition): void {
    this.editingId = record.id;

    // ✅ patchValue because weightage control is disabled
    this.form.patchValue({
      perspectives: record.perspectives ?? '',
      strategicObjectives: record.strategicObjectives ?? '',
      keyPerformanceIndicators: record.keyPerformanceIndicators ?? '',
      unit: record.unit ?? '',
      descriptionOfKPI: record.descriptionOfKPI ?? '',
      pointsApplicable: record.pointsApplicable ?? 0,
    });

    // ✅ set readonly calculated field
    this.form.controls.weightage.setValue(record.weightage ?? 0);

    setTimeout(() => {
      const formSection = document.querySelector('.form-section');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 0);
  }

 onDelete(id: number): void {
    if (!window.confirm('Delete this KPI row?')) return;

    this.saving = true;
    this.errorMessage = '';

    this.http
      .delete(`${this.apiBase}/${id}`)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          // ✅ backend recalculated weightage for remaining rows
          this.fetchData();
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.errorMessage = 'Delete failed.';
        },
      });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  private buildPayload(): UpsertKpiDefinitionRequest {
    const raw = this.form.getRawValue(); // includes disabled too (fine)
    const now = new Date();

    return {
      perspectives: raw.perspectives.trim(),
      strategicObjectives: raw.strategicObjectives.trim(),
      keyPerformanceIndicators: raw.keyPerformanceIndicators.trim(),
      unit: raw.unit.trim(),
      descriptionOfKPI: raw.descriptionOfKPI.trim(),

      // ✅ only input needed
      pointsApplicable: Number(raw.pointsApplicable),

      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }

  private resetForm(): void {
    this.form.reset({
      perspectives: '',
      strategicObjectives: '',
      keyPerformanceIndicators: '',
      unit: '',
      descriptionOfKPI: '',
      pointsApplicable: 0,
      weightage: 0, // will be set by backend after save
    });

    // ✅ because weightage is disabled, set it manually too
    this.form.controls.weightage.setValue(0);

    this.editingId = null;
    this.errorMessage = '';
  }

  // ✅ UI helper: show % with 4 decimals (same as DB)
  formatWeightage(val: number | null | undefined): string {
    const n = Number(val ?? 0);
    return `${n.toFixed(4)}%`;
  }

  /** Total points from saved records (table display) */
  private calculateTotalPointsForRecords(): number {
    return this.records.reduce((sum, r) => sum + (r.pointsApplicable ?? 0), 0);
  }

  /** Display weightage normalized to total points (table display) */
  getComputedWeightageForRecord(record: KpiDefinition): string {
    const totalPoints = this.calculateTotalPointsForRecords();
    if (totalPoints <= 0) return '0.0000%';
    const weightage = (Number(record.pointsApplicable ?? 0) / totalPoints) * 100;
    return `${weightage.toFixed(4)}%`;
  }

  /** Calculate total points from all records + current input for live preview */
  calculateTotalPoints(): number {
    const currentPoints = Number(this.form.get('pointsApplicable')?.value ?? 0);
    const existingPoints = this.records
      .filter((r) => r.id !== this.editingId)
      .reduce((sum, r) => sum + (r.pointsApplicable ?? 0), 0);
    return existingPoints + currentPoints;
  }

  /** Calculate live weightage preview based on current points input */
  calculateLiveWeightage(): string {
    const pointsApplicable = Number(this.form.get('pointsApplicable')?.value ?? 0);
    const totalPoints = this.calculateTotalPoints();
    
    if (totalPoints <= 0 || pointsApplicable <= 0) return '0.00%';
    const weightage = (pointsApplicable / totalPoints) * 100;
    return weightage.toFixed(2) + '%';
  }

  /** Get total points for display hint */
  getTotalPointsDisplay(): number {
    return this.calculateTotalPoints();
  }
}
