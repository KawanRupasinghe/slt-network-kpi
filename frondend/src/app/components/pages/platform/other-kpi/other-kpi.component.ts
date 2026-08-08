import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegionService, Region } from '../../../../services/region.service';
import { TelemetryService } from '../../../../services/telemetry.service';
import { PowerAndACService, PowerAndACRecord } from '../../../../services/power-and-ac.service';
import { AuthService } from '../../../../services/auth.service';
import { FilterUtils } from '../../../../utils/filter.utils';
import {
  buildEngineerDisplayLookupMap,
  formatEngineerDisplay,
  mapRegionRecords,
  normalizeLookupKey
} from '../../../../utils/region-display.utils';



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
  engName?: string;
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
  pacEngineerNameMap: Record<string, string> = {};

  get monthOptions() { return FilterUtils.getMonthOptions(this.pacYear); }
  yearOptions: number[] = FilterUtils.generatePlatformYearOptions();

  // Injects the required dependencies.
  constructor(
    private regionService: RegionService,
    private telService: TelemetryService,
    private pacService: PowerAndACService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  // Initializes the component by checking permissions and loading required data.
  ngOnInit(): void {
    this.isEditingAllowed = this.authService.canEditPage('Other KPI');
    this.loadRegions();
    this.loadPowerAndAC();
  }

  // ── Computed ──

  // Gets the label for the selected telemetry month.
  get telMonthLabel(): string {
    return this.monthOptions.find(m => m.value === this.telMonth)?.label ?? '';
  }

  // ── Filter handlers ──

  // Handles changes to the telemetry month or year.
  onMonthYearChange(): void {
    this.refresh();
  }

  // Handles changes to the telemetry region.
  onRegionChange(): void {
    this.refresh();
  }

  // ── Region + Telemetry loading (same pattern as node-failures) ──

  // Loads region data, builds the area map, and triggers telemetry refresh.
  private loadRegions(): void {
    this.telLoading = true;
    this.regionService.getAll().subscribe({
      next: (res: Region[] | any[]) => {
        const list = Array.isArray(res) ? res : [];
        const regionRows = mapRegionRecords(list);
        this.pacEngineerNameMap = buildEngineerDisplayLookupMap(regionRows);

        // Unique region names for R-GM dropdown
        this.regionOptions = Array.from(
          new Set(regionRows.map((x) => x.region ?? '').filter(Boolean))
        );

        // Build one AreaRow per distinct networkengineer
        const temp: Record<string, AreaRow> = {};
        regionRows.forEach((item) => {
          const ne: string = (item.networkEngineer ?? '').trim();
          const engName: string = (item.engName ?? '').trim();
          const lea: string = (item.lea ?? '').trim();
          if (!ne) return;
          if (!temp[ne]) {
            const leaNorm = this.norm(lea);
            temp[ne] = {
              designation: ne,
              friendlyName: AREA_MAPPING[leaNorm] || lea.toUpperCase() || ne,
              region: item.region ?? '',
              province: item.province ?? '',
              networkEngineer: formatEngineerDisplay(ne, engName),
              engName,
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

  // Refreshes the telemetry data based on current filters.
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

  // Enters edit mode for a specific telemetry row.
  editRow(row: AreaRow): void {
    row.originalPercentage = row.percentage;
    row.originalNodeCount = row.node_Count;
    row.isEditing = true;
  }

  // Cancels editing and restores original values.
  cancelEdit(row: AreaRow): void {
    if (row.originalPercentage !== undefined) row.percentage = row.originalPercentage;
    if (row.originalNodeCount !== undefined) row.node_Count = row.originalNodeCount;
    row.isEditing = false;
  }

  // Saves the updated telemetry data for a specific area.
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

  // Handles changes to the Power & AC year filter.
  onPacYearChange(): void {
    this.loadPowerAndAC();
  }

  // Loads Power & AC data for the selected year.
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

  // Gets a sorted list of unique Power & AC designations.
  get pacDesignations(): string[] {
    if (!this.pacRows) return [];
    return Array.from(new Set(this.pacRows.map(r => r.designation))).sort();
  }

  // Gets the display name for a given Power & AC designation.
  getPacDesignationDisplay(designation: string): string {
    return this.pacEngineerNameMap[designation]
      ?? this.pacEngineerNameMap[normalizeLookupKey(designation)]
      ?? designation;
  }

  // Gets the Power & AC record for a specific designation and month.
  getPacRecord(designation: string, month: number): PowerAndACRecord | undefined {
    return this.pacRows.find(r => r.designation === designation && r.month === month);
  }

  // Gets the scheduled or achieved value for a Power & AC record.
  getPacValue(designation: string, month: number, type: 'sched' | 'achieved'): string {
    const record = this.getPacRecord(designation, month);
    if (!record) return '—';
    return type === 'sched' ? String(record.cumulative_Sched) : String(record.cumulative_Achieved);
  }

  // Toggles the verification status of a Power & AC record.
  togglePacVerified(designation: string, month: number): void {
    if (!this.isEditingAllowed) {
      return;
    }

    const record = this.getPacRecord(designation, month);
    if (record && record.id) {
      this.pacService.toggleVerified(record.id).subscribe({
        next: (res) => {
          record.isVerified = res.isVerified;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to toggle verified state for PowerAndAC', err);
        }
      });
    }
  }

  // Gets the abbreviated month label for a given month number.
  getMonthLabel(month: number): string {
    return this.monthOptions.find(m => m.value === month)?.label?.substring(0, 3) ?? String(month);
  }

  // Normalizes a string for comparison.
  private norm(s: string): string {
    return s ? s.replace(/[^A-Za-z0-9]/g, '').toLowerCase() : '';
  }


}
