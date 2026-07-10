/*
 File: tower-mtce-achievement.component.ts
 Description: Other Operator KPI admin management page (historically named tower-mtce-achievement)
 Purpose: CRUD operations for Other Operator KPI definitions.
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OtherOperatorKpiService, OtherOperatorKpiRecord, CreateOtherOperatorKpi, OtherOperatorTargetDto, CreateOtherOperatorTargetDto } from '../../../../services/other-operator-kpi.service';

@Component({
  selector: 'app-other-operator',

  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  // Target Variables
  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  monthOptions: { value: number; label: string }[] = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  yearOptions: number[] = [];
  allTargets: OtherOperatorTargetDto[] = [];
  targetEditValues: { [kpiId: number]: string } = {};
  targetSaving: { [kpiId: number]: boolean } = {};
  targetsExpanded = true;

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

    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      this.yearOptions.push(y);
    }

    this.loadData();
    this.loadTargets();
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

  // =========================
  // TARGET ASSIGNMENT
  // =========================
  toggleTargetsExpanded(): void {
    this.targetsExpanded = !this.targetsExpanded;
  }

  onTargetPeriodChange(): void {
    this.populateTargetEditValues();
  }

  loadTargets(): void {
    this.service.getTargets().subscribe({
      next: (data) => {
        this.allTargets = data;
        this.populateTargetEditValues();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load targets', err);
      }
    });
  }

  populateTargetEditValues(): void {
    this.targetEditValues = {};
    for (const record of this.records) {
      const target = this.getTargetForKpi(record.id);
      this.targetEditValues[record.id] = target?.section || '';
    }
  }

  getTargetForKpi(kpiId: number): OtherOperatorTargetDto | undefined {
    return this.allTargets.find(t => 
      t.otherOperatorKpiId === kpiId && 
      t.month === Number(this.selectedMonth) && 
      t.year === Number(this.selectedYear)
    );
  }

  saveTarget(kpiId: number): void {
    const val = this.targetEditValues[kpiId];
    // if (!val) return; // Allow empty string to save empty target if needed

    this.targetSaving[kpiId] = true;
    const existing = this.getTargetForKpi(kpiId);

    const payload: CreateOtherOperatorTargetDto = {
      otherOperatorKpiId: kpiId,
      section: val,
      month: Number(this.selectedMonth),
      year: Number(this.selectedYear)
    };

    if (existing) {
      this.service.updateTarget(existing.id, payload).subscribe({
        next: () => {
          existing.section = val;
          this.targetSaving[kpiId] = false;
          this.cdr.detectChanges();
          alert('Target updated successfully.');
        },
        error: (err) => {
          console.error(err);
          this.targetSaving[kpiId] = false;
          alert('Failed to update target.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.service.createTarget(payload).subscribe({
        next: (newTarget) => {
          this.allTargets.push(newTarget);
          this.targetSaving[kpiId] = false;
          this.cdr.detectChanges();
          alert('Target created successfully.');
        },
        error: (err) => {
          console.error(err);
          this.targetSaving[kpiId] = false;
          alert('Failed to create target.');
          this.cdr.detectChanges();
        }
      });
    }
  }
}

