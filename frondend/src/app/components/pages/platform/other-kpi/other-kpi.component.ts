import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegionService, Region } from '../../../../services/region.service';
import { TelemetryService } from '../../../../services/telemetry.service';
import { PowerAndACService, PowerAndACRecord } from '../../../../services/power-and-ac.service';
import { AuthService } from '../../../../services/auth.service';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
];

const AREA_MAPPING: Record<string, string> = {
  cenhkmd: 'CEN/HK/MD', gqkintb: 'GQ / KI / NTB', ndfrm: 'ND / RM',
  awho: 'AW / HO', konix: 'KON / KX', ngivt: 'NG / WT', kgkly: 'KG / KLY',
  cwpx: 'CW / PX', debkymt: 'DB / KY / MT', gphtnw: 'GP / HT / NW',
  adipr: 'AD / PR', bddwmrg: 'BD / BW / MRG', keirn: 'KE / RN',
  embmbmh: 'EMB / HB / MH', aggl: 'AG / GL', hrktph: 'HR / KT / PH',
  bcjrdkltc: 'BC / AP / KL / TC', ja: 'JA', komltmbva: 'KO / MLT / MB / VA',
};

interface AreaRow {
  designation: string;   // networkengineer value — used to match Telemetry.Designation
  friendlyName: string;  // from leaCode via AREA_MAPPING
  region: string;        // R-GM
  province: string;      // P-DGM
  networkEngineer: string;
  percentage: number;
  node_Count: number | null;
  isEditing?: boolean;
  originalPercentage?: number;
  originalNodeCount?: number | null;
}

@Component({
  selector: 'app-other-kpi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './other-kpi.component.html',
  styleUrls: ['./other-kpi.component.scss']
})
export class OtherKpiComponent implements OnInit {
  pageTitle = 'Other KPI';

  // ── Telemetry filter state ──
  telMonth: number = new Date().getMonth() + 1;
  telYear: number = new Date().getFullYear();
  telRegion: string = '';

  telLoading = false;
  telError: string | null = null;

  allAreas: AreaRow[] = [];          // built from RegionData — always full list
  tableRows: AreaRow[] = [];         // filtered + merged with DB values
  regionOptions: string[] = [];
  isEditingAllowed: boolean = false;

  // ── Power & AC filter state ──
  pacYear: number = new Date().getFullYear();
  pacLoading = false;
  pacError: string | null = null;
  pacRows: PowerAndACRecord[] = [];

  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions: number[] = this.buildYears();

  constructor(
    private regionService: RegionService,
    private telService: TelemetryService,
    private pacService: PowerAndACService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isEditingAllowed = this.authService.canEditPage('Other KPI');
    this.loadRegions();
    this.loadPowerAndAC();
  }

  // ── Computed ──

  get telMonthLabel(): string {
    return MONTH_OPTIONS.find(m => m.value === this.telMonth)?.label ?? '';
  }

  // ── Filter handlers ──

  onMonthYearChange(): void {
    this.refresh();
  }

  onRegionChange(): void {
    this.refresh();
  }

  // ── Region + Telemetry loading (same pattern as node-failures) ──

  private loadRegions(): void {
    this.telLoading = true;
    this.regionService.getAll().subscribe({
      next: (res: Region[] | any[]) => {
        const list = Array.isArray(res) ? res : [];

        // Unique region names for R-GM dropdown
        this.regionOptions = Array.from(
          new Set(list.map((x: any) => x.region ?? x.Region ?? '').filter(Boolean))
        );

        // Build one AreaRow per distinct networkengineer
        const temp: Record<string, AreaRow> = {};
        list.forEach((item: any) => {
          const ne: string = (item.networkengineer ?? item.networkEngineer ?? item.NetworkEngineer ?? '').trim();
          const lea: string = (item.leacode ?? item.leaCode ?? item.lea ?? '').trim();
          if (!ne) return;
          if (!temp[ne]) {
            const leaNorm = this.norm(lea);
            temp[ne] = {
              designation: ne,
              friendlyName: AREA_MAPPING[leaNorm] || lea.toUpperCase() || ne,
              region: item.region ?? item.Region ?? '',
              province: item.province ?? item.Province ?? '',
              networkEngineer: ne,
              percentage: 0,
              node_Count: null,
            };
          }
        });
        this.allAreas = Object.values(temp);
        this.refresh();
      },
      error: () => {
        this.telError = 'Failed to load region data.';
        this.telLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refresh(): void {
    this.telLoading = true;
    this.telError = null;
    this.cdr.detectChanges();

    this.telService.getAll(this.telYear, this.telMonth).subscribe({
      next: rows => {
        // Build a map: networkengineer (lowercase) → { percentage, node_Count }
        const dbMap = new Map<string, { percentage: number; node_Count: number | null }>();
        (rows ?? []).forEach(r => {
          dbMap.set(r.designation.trim().toLowerCase(), {
            percentage: r.percentage,
            node_Count: r.node_Count ?? null,
          });
        });

        // Merge DB values into allAreas
        let merged: AreaRow[] = this.allAreas.map(area => {
          const dbVal = dbMap.get(area.designation.toLowerCase());
          return {
            ...area,
            percentage: dbVal?.percentage ?? 0,
            node_Count: dbVal?.node_Count ?? null,
          };
        });

        // Apply R-GM filter
        if (this.telRegion) {
          merged = merged.filter(r => r.region === this.telRegion);
        }

        this.tableRows = merged;
        this.telLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.telError = 'Failed to load Telemetry data.';
        this.telLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  editRow(row: AreaRow): void {
    row.originalPercentage = row.percentage;
    row.originalNodeCount = row.node_Count;
    row.isEditing = true;
  }

  cancelEdit(row: AreaRow): void {
    if (row.originalPercentage !== undefined) row.percentage = row.originalPercentage;
    if (row.originalNodeCount !== undefined) row.node_Count = row.originalNodeCount;
    row.isEditing = false;
  }

  saveRow(row: AreaRow): void {
    const payload = {
      designation: row.designation,
      year: this.telYear,
      month: this.telMonth,
      percentage: row.percentage,
      node_Count: row.node_Count
    };
    
    this.telService.upsert(payload).subscribe({
      next: () => {
        row.isEditing = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.telError = 'Failed to save Telemetry data.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Power & AC ──

  onPacYearChange(): void {
    this.loadPowerAndAC();
  }

  loadPowerAndAC(): void {
    this.pacLoading = true;
    this.pacError = null;
    this.pacService.getByYear(this.pacYear).subscribe({
      next: rows => {
        this.pacRows = rows ?? [];
        this.pacLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pacError = 'Failed to load Power & AC data.';
        this.pacLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getMonthLabel(month: number): string {
    return MONTH_OPTIONS.find(m => m.value === month)?.label?.substring(0, 3) ?? String(month);
  }

  private norm(s: string): string {
    return s ? s.replace(/[^A-Za-z0-9]/g, '').toLowerCase() : '';
  }

  private buildYears(): number[] {
    const cur = new Date().getFullYear();
    return [cur + 1, cur, cur - 1, cur - 2];
  }
}
