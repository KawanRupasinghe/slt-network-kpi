/*
 File: region-management.component.ts
 Description: Region management and assignment page
 Purpose: Manage regional entities, assign network engineers, configure LEA codes.
 Features: CRUD operations, region listing, engineer assignment, data validation
*/

import { Inject, ChangeDetectorRef } from '@angular/core';

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RegionService } from '../../../../services/region.service';

// Use the same interface as the service for consistency
export interface Region {
  id: number;
  region: string;
  province: string;
  networkengineer: string;
  leacode: string;
}

type RegionKey = 'region' | 'province' | 'networkengineer' | 'leacode';

@Component({
  selector: 'app-region-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './region-management.component.html',
  styleUrls: ['./region-management.component.scss'],
})
export class RegionManagementComponent {
  constructor(
    @Inject(RegionService) private regionService: RegionService,
    private cdr: ChangeDetectorRef
  ) {}
  
  pageTitle = 'Region Management';
  showForm = false;
  isSubmitting = false;
  error = '';
  success = '';
  
  // Form data with correct property names
  formData: Omit<Region, 'id'> = {
    region: '',
    province: '',
    networkengineer: '',
    leacode: '',
  };
  
  regions: Region[] = [];
  sortKey: RegionKey | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  editingRowId: number | null = null;
  editingField: RegionKey | null = null;
  editingValue = '';

  ngOnInit(): void {
    this.loadRegions();
  }

  loadRegions(): void {
    this.regionService.getAll().subscribe({
      next: (data: any[]) => {
        console.log('Raw data from service:', data); // Debug log
        
        // Map the data properly
        this.regions = data.map(item => {
          console.log('Processing item:', item); // Debug log
          
          // Handle different possible property names from backend
          return {
            id: item.id || item.ID || 0,
            region: item.region || item.Region || item.REGION || '',
            province: item.province || item.Province || item.PROVINCE || '',
            networkengineer: item.networkengineer || item.networkEngineer || 
                           item.NetworkEngineer || item.NETWORKENGINEER || 
                           item.ne || item.NE || '',
            leacode: item.leacode || item.leaCode || item.lea || 
                    item.LEA || item.Lea || item.LEACODE || ''
          };
        });
        
        console.log('Processed regions:', this.regions); // Debug log
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Error loading regions:', err);
        this.error = 'Failed to load region data';
        this.cdr.detectChanges();
      }
    });
  }

  /* ================= HEADER / FORM HELPERS ================= */

  openForm(): void {
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  closeForm(form?: NgForm): void {
    this.showForm = false;
    this.error = '';
    this.success = '';
    this.resetForm(form);
  }

  resetForm(form?: NgForm): void {
    this.formData = {
      region: '',
      province: '',
      networkengineer: '',
      leacode: '',
    };

    if (form) {
      form.resetForm();
    }
  }

  /* ================= ADD REGION (SUBMIT) ================= */

  onSubmit(form: NgForm): void {
    this.error = '';
    this.success = '';

    if (!form.valid) {
      this.error = 'Please fill all required fields.';
      form.control.markAllAsTouched();
      return;
    }

    const trimmed = {
      region: this.formData.region.trim(),
      province: this.formData.province.trim(),
      networkengineer: this.formData.networkengineer.trim(),
      leacode: this.formData.leacode.trim(),
    };

    if (
      !trimmed.region ||
      !trimmed.province ||
      !trimmed.networkengineer ||
      !trimmed.leacode
    ) {
      this.error = 'All fields are required.';
      return;
    }

    this.isSubmitting = true;

    this.regionService.create({
      region: trimmed.region,
      province: trimmed.province,
      networkengineer: trimmed.networkengineer,
      leacode: trimmed.leacode
    }).subscribe({
      next: (created: any) => {
        console.log('Created region:', created); // Debug log
        
        // Map the response to match our Region interface
        const newRegion: Region = {
          id: created.id || created.ID || this.regions.length + 1,
          region: created.region || created.Region || '',
          province: created.province || created.Province || '',
          networkengineer: created.networkengineer || created.networkEngineer || 
                         created.NetworkEngineer || '',
          leacode: created.leacode || created.leaCode || created.lea || ''
        };
        
        this.regions = [newRegion, ...this.regions];
        this.success = 'Region added successfully.';
        this.isSubmitting = false;
        this.closeForm(form);
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Error creating region:', err);
        this.error = 'Failed to add region.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  /* ================= SORTING ================= */

  requestSort(key: RegionKey): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
  }

  getSortIndicator(key: RegionKey): string {
    if (this.sortKey !== key) return '';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  get sortedRegions(): Region[] {
    const data = [...this.regions];
    if (!this.sortKey) return data;

    const key = this.sortKey;
    const direction = this.sortDirection;

    return data.sort((a, b) => {
      const aVal = (a[key] ?? '').toString().toLowerCase();
      const bVal = (b[key] ?? '').toString().toLowerCase();

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /* ================= INLINE CELL EDITING ================= */

  isEditingCell(row: Region, field: RegionKey): boolean {
    return this.editingRowId === row.id && this.editingField === field;
  }

  startCellEdit(row: Region, field: RegionKey): void {
    this.editingRowId = row.id;
    this.editingField = field;
    this.editingValue = (row[field] ?? '').toString();
  }

  onCellKeydown(
    event: KeyboardEvent,
    row: Region,
    field: RegionKey
  ): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveCell(row, field);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelCellEdit();
    }
  }

  saveCell(row: Region, field: RegionKey): void {
    const value = this.editingValue.trim();
    if (!value) return;

    // Create update payload
    const updateData = {
      id: row.id,
      region: field === 'region' ? value : row.region,
      province: field === 'province' ? value : row.province,
      networkengineer: field === 'networkengineer' ? value : row.networkengineer,
      leacode: field === 'leacode' ? value : row.leacode
    };

    this.regionService.update(row.id, updateData).subscribe({
      next: (res: any) => {
        // Update the row with the response
        Object.assign(row, {
          id: res.id || row.id,
          region: res.region || res.Region || row.region,
          province: res.province || res.Province || row.province,
          networkengineer: res.networkengineer || res.networkEngineer || 
                         res.NetworkEngineer || row.networkengineer,
          leacode: res.leacode || res.leaCode || res.lea || row.leacode
        });
        this.cancelCellEdit();
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Error updating region:', err);
        alert('Update failed');
        this.cdr.detectChanges();
      }
    });
  }

  cancelCellEdit(): void {
    this.editingRowId = null;
    this.editingField = null;
    this.editingValue = '';
  }

  /* ================= DELETE ROW ================= */

  handleDelete(id: number): void {
    if (!confirm('Are you sure you want to delete this region entry?')) return;

    this.regionService.delete(id).subscribe({
      next: () => {
        this.regions = this.regions.filter(r => r.id !== id);
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('Error deleting region:', err);
        alert('Delete failed');
        this.cdr.detectChanges();
      }
    });
  } 
}
