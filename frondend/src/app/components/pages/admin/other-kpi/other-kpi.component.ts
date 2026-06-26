/*
 File: other-kpi.component.ts
 Description: Other KPI admin management
 Purpose: CRUD operations for Other KPI definitions.
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OtherKpiService, OtherKpiRecord, CreateOtherKpi } from '../../../../services/other-kpi.service';

@Component({
  selector: 'app-other-kpi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './other-kpi.component.html',
  styleUrls: ['./other-kpi.component.scss']
})
export class OtherKpiComponent implements OnInit {

  pageTitle = 'Other KPI';

  records: OtherKpiRecord[] = [];
  editingId: number | null = null;

  loading = false;
  saving = false;
  errorMessage = '';

  form!: any;

  constructor(
    private fb: FormBuilder,
    private service: OtherKpiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      networkEngineerKpi: ['', Validators.required],
      division: [''],
      section: [''],
      kpiPercent: ['']
    });
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (res) => { this.loading = false; this.records = res; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.errorMessage = 'Failed to load KPI data'; this.cdr.detectChanges(); }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const payload: CreateOtherKpi = {
      networkEngineerKpi: this.form.value.networkEngineerKpi,
      division: this.form.value.division || undefined,
      section: this.form.value.section || undefined,
      kpiPercent: this.form.value.kpiPercent ? Number(this.form.value.kpiPercent) : undefined
    };

    this.saving = true;

    if (this.editingId) {
      this.service.update(this.editingId, payload).subscribe({
        next: () => { this.saving = false; this.resetForm(); this.fetchData(); this.cdr.detectChanges(); },
        error: () => { this.saving = false; this.errorMessage = 'Save failed'; this.cdr.detectChanges(); }
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => { this.saving = false; this.resetForm(); this.fetchData(); this.cdr.detectChanges(); },
        error: () => { this.saving = false; this.errorMessage = 'Save failed'; this.cdr.detectChanges(); }
      });
    }
  }

  onEdit(record: OtherKpiRecord): void {
    this.editingId = record.id;
    this.form.patchValue({
      networkEngineerKpi: record.networkEngineerKpi,
      division: record.division || '',
      section: record.section || '',
      kpiPercent: record.kpiPercent || ''
    });
  }

  onDelete(id: number): void {
    if (!confirm('Delete this record?')) return;
    this.saving = true;
    this.service.delete(id).subscribe({
      next: () => { this.saving = false; this.fetchData(); this.cdr.detectChanges(); },
      error: () => { this.saving = false; this.errorMessage = 'Delete failed'; this.cdr.detectChanges(); }
    });
  }

  onCancelEdit(): void { this.resetForm(); }

  private resetForm(): void { this.form.reset(); this.editingId = null; }
}
