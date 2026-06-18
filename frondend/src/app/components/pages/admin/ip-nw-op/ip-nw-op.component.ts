/*
 File: ip-nw-op.component.ts
 Description: IP Network Operations KPI admin management
 Purpose: CRUD operations for IP NW OP KPI metrics and performance targets.
 Features: Data table management, add/edit/delete operations, form validation
*/

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IpNwOpService, IpNwOpKpiDto } from '../../../../services/ip-nw-op.service';

/* ========== IP NW OP ADMIN COMPONENT ========== */

@Component({
  selector: 'app-admin-ip-nw-op',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ip-nw-op.component.html',
  styleUrls: ['./ip-nw-op.component.scss'],
})
export class AdminIpNwOpComponent implements OnInit {
  /* Page display title */
  pageTitle = 'IP NW OP';

  /* IP NW OP KPI data table */
  data: IpNwOpKpiDto[] = [];

  /* Form data object */
  form = {
    network_engineer_kpi: '',
    division: '',
    section: '',
    kpi_percent: '',
  };

  editingId: number | null = null;

  loading = false;
  error: string | null = null;

  constructor(
    private ipNwOpService: IpNwOpService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.ipNwOpService.getAll().subscribe({
      next: (res) => {
        this.data = Array.isArray(res) ? res : [];
        this.sortData();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.data = [];
        this.error = 'Failed to load data. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  handleInputChange(name: string, value: string): void {
    const fieldMapping: Record<string, keyof typeof this.form> = {
      kpi: 'network_engineer_kpi',
      division: 'division',
      section: 'section',
      kpi_percent: 'kpi_percent',
    };

    const fieldName = fieldMapping[name] || (name as keyof typeof this.form);
    this.form = { ...this.form, [fieldName]: value };
  }

  async save(): Promise<void> {
    this.error = null;

    const payload = {
      network_engineer_kpi: this.form.network_engineer_kpi.trim(),
      division: this.form.division.trim(),
      section: this.form.section.trim(),
      kpi_percent: Number(this.form.kpi_percent),
    };

    if (
      !payload.network_engineer_kpi ||
      !payload.division ||
      !payload.section ||
      Number.isNaN(payload.kpi_percent)
    ) {
      this.error = 'Please fill all fields correctly.';
      return;
    }

    try {
      if (this.editingId !== null) {
        // UPDATE
        await firstValueFrom(
          this.ipNwOpService.update(this.editingId, payload)
        );

        // update local array instantly
        const idx = this.data.findIndex((x) => x.id === this.editingId);
        if (idx !== -1) {
          this.data[idx] = { ...this.data[idx], ...payload };
          this.sortData();
        }
      } else {
        // ADD
        const res = await firstValueFrom(
          this.ipNwOpService.add(payload)
        );

        // insert locally instantly
        this.data.push(res);
        this.sortData();
      }

      this.resetForm();
    } catch (err) {
      console.error(err);
      this.error = 'Failed to save data. Please try again.';
    }
  }

  editRow(item: IpNwOpKpiDto): void {
    this.form = {
      network_engineer_kpi: item.network_engineer_kpi ?? '',
      division: item.division ?? '',
      section: item.section ?? '',
      kpi_percent: String(item.kpi_percent ?? ''),
    };

    this.editingId = item.id;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  async deleteRow(id: number): Promise<void> {
    const ok = window.confirm('Are you sure you want to delete this item?');
    if (!ok) return;

    try {
      await firstValueFrom(this.ipNwOpService.delete(id));

      // remove locally instantly
      this.data = this.data.filter((x) => x.id !== id);
    } catch (err) {
      console.error(err);
      this.error = 'Failed to delete item. Please try again.';
    }
  }

  private sortData(): void {
    this.data = [...this.data].sort((a, b) =>
      (a.network_engineer_kpi ?? '').localeCompare(b.network_engineer_kpi ?? '')
    );
  }

  resetForm(): void {
    this.form = {
      network_engineer_kpi: '',
      division: '',
      section: '',
      kpi_percent: '',
    };
    this.editingId = null;
  }
}
