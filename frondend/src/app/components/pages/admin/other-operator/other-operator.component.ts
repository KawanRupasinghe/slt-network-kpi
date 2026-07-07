/*
 File: tower-mtce-achievement.component.ts
 Description: Other Operator KPI admin management page (historically named tower-mtce-achievement)
 Purpose: CRUD operations for Other Operator KPI definitions.
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OtherOperatorKpiService, OtherOperatorKpiRecord, CreateOtherOperatorKpi } from '../../../../services/other-operator-kpi.service';

@Component({
  selector: 'app-other-operator',

  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './other-operator.component.html',
  styleUrls: ['./other-operator.component.scss']
})
export class OtherOperatorComponent implements OnInit {

  pageTitle = 'Other Operator';
  records: OtherOperatorKpiRecord[] = [];

  form!: FormGroup;
  loading = false;
  saving = false;
  errorMessage = '';
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private service: OtherOperatorKpiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      networkEngineerKpi: ['', Validators.required],
      division: [''],
      section: [''],
      kpiPercent: ['']
    });

    this.loadData();
  }

  // =========================
  // LOAD DATA
  // =========================
  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service.getAll().subscribe({
      next: (data: OtherOperatorKpiRecord[]) => {
        // IMPORTANT: calculations rely on KPI Id, not on list order.
        // This client-side sort only changes presentation.
        const preferredOrder = new Map<number, number>([
          [2, 1], // Repeated Fault Index
          [1, 2], // Fault Clearance Rate < 4 hrs
          [4, 3], // Fault Clearance Rate < 8 hrs
          [3, 4]  // Fault Rate
        ]);

        this.records = [...data].sort((a, b) => {
          const ra = preferredOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const rb = preferredOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          if (ra !== rb) return ra - rb;
          return a.id - b.id;
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.errorMessage = 'Failed to load KPI data';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // CREATE / UPDATE
  // =========================
  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const payload: CreateOtherOperatorKpi = {
      networkEngineerKpi: this.form.value.networkEngineerKpi,
      division: this.form.value.division || undefined,
      section: this.form.value.section || undefined,
      kpiPercent: this.form.value.kpiPercent ? Number(this.form.value.kpiPercent) : undefined
    };

    if (this.editingId) {
      this.service.update(this.editingId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.loadData();
        },
        error: (err: any) => {
          console.error(err);
          this.errorMessage = 'Failed to update KPI';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.resetForm();
          this.loadData();
        },
        error: (err: any) => {
          console.error(err);
          this.errorMessage = 'Failed to add KPI';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // =========================
  // EDIT
  // =========================
  onEdit(record: OtherOperatorKpiRecord): void {
    this.editingId = record.id;
    this.form.patchValue({
      networkEngineerKpi: record.networkEngineerKpi,
      division: record.division || '',
      section: record.section || '',
      kpiPercent: record.kpiPercent || ''
    });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  // =========================
  // DELETE
  // =========================
  onDelete(id: number): void {
    if (!confirm('Delete this KPI?')) return;

    this.saving = true;

    this.service.delete(id).subscribe({
      next: () => this.loadData(),
      error: (err: any) => {
        this.errorMessage = 'Failed to delete KPI';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // HELPERS
  // =========================
  resetForm(): void {
    this.form.reset();
    this.editingId = null;
    this.saving = false;
  }
}
