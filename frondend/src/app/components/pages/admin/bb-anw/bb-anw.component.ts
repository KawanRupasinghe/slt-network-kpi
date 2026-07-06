/*
 File: bb-anw.component.ts
 Description: Broadband & Access Network KPI admin management
 Purpose: CRUD operations for BB & ANW KPI metrics including node-level details.
 Features: Data table management, add/edit/delete operations, form handling
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BbAnwService, BbAnwHeaderDto } from '../../../../services/bb-anw.service';

/* ========== BB ANW ADMIN COMPONENT ========== */

@Component({
  selector: 'app-bb-anw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bb-anw.component.html',
  styleUrls: ['./bb-anw.component.scss']
})
export class BbAnwComponent implements OnInit {
  /* Page display title */
  pageTitle = 'Wireline Access NW';
  /* BB ANW KPI data table */
  data: BbAnwHeaderDto[] = [];

  /* Loading state indicator */
  loading = false;
  /* Save operation state */
  saving = false;
  /* Error message display */
  error = '';

  /* Currently editing row ID */
  editingId: number | null = null;
  /* Form visibility toggle */
  showForm = false;

  /* Form data object */
  form: BbAnwHeaderDto = this.emptyForm();

  constructor(
    private service: BbAnwService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private emptyForm(): BbAnwHeaderDto {
    return {
      id: undefined,
      networkEngineerKpi: '',
      division: '',
      section: '',
      kpiPercent: null
    };
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    this.service.getHeaders().subscribe({
      next: res => {
        this.data = Array.isArray(res) ? res : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load data';
        this.data = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => this.loading = false
    });
  }

  submitForm(): void {
    this.saving = true;
    this.error = '';

    const payload = this.normalizeForm();

    const request$ = this.editingId !== null
      ? this.service.updateHeader(this.editingId, payload)
      : this.service.addHeader(payload);

    request$.subscribe({
      next: () => {
        this.closeForm();
        this.loadData();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error(err);
        this.error = 'Save failed';
        this.saving = false;
        this.cdr.detectChanges();
      },
      complete: () => this.saving = false
    });
  }

  editRow(row: BbAnwHeaderDto): void {
    this.showForm = true;
    this.editingId = row.id ?? null;

    this.form = {
      id: row.id,
      networkEngineerKpi: row.networkEngineerKpi,
      division: row.division ?? '',
      section: row.section ?? '',
      kpiPercent: row.kpiPercent ?? null
    };
  }

  deleteRow(id?: number): void {
    if (typeof id !== 'number' || !confirm('Delete this KPI header? (This will also delete node rows in DB)')) return;

    this.saving = true;
    this.service.delete(id).subscribe({
      next: () => {
        this.loadData();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Delete failed';
        this.cdr.detectChanges();
      },
      complete: () => this.saving = false
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  openForm(): void {
    this.showForm = true;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  trackRow(index: number, row: BbAnwHeaderDto): string {
    return row.id !== undefined ? row.id.toString() : `row-${index}`;
  }

  private normalizeForm(): BbAnwHeaderDto {
    return {
      id: this.editingId ?? undefined,
      networkEngineerKpi: (this.form.networkEngineerKpi || '').trim(),
      division: this.form.division?.trim() || null,
      section: this.form.section?.trim() || null,
      kpiPercent: this.form.kpiPercent === null || this.form.kpiPercent === undefined
        ? null
        : Number(this.form.kpiPercent)
    };
  }
}
