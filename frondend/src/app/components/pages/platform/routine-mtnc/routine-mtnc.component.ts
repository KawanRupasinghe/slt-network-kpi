import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as ExcelJS from 'exceljs';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

/* ================= TYPES ================= */

type RoutineRecord = {
  _id?: number;  // Changed from string to number (int identity)
  no?: number;
  kpi?: string;
  target?: string;
  calculation?: string;
  platform?: string;
  responsibleDGM?: string;
  definedOLADetails?: string;
  dataSources?: string;
};

type PlatformDetail = {
  Column1: string;
  column2?: number | string;
  column3?: number | string;
  Column4?: number | string;
};

type PlatformRecord = {
  month: string;
  data: {
    [key: string]: PlatformDetail;
  };
  details?: any[];   // optional (since it exists in API)
};

type PlatformKey = 'msan' | 'vpn' | 'slbn';

type PlaceholderMap = Record<string, string>;
type TowerSumRecord = Record<string, number>;

type PlatformTableConfig = {
  key: PlatformKey;
  title: string;
  monthsLimit: number;
};

type MaintenanceRow = {
  routine: RoutineRecord;
  platformKey: PlatformKey | null;
};

/* ================= CONSTANTS ================= */

const PLATFORM_COLUMNS = [
  'NW/WPC-1', 'NW/WPC-2', 'NW/WPNE', 'NW/WPSW', 'NW/WPSE',
  'NW/WPE', 'NW/WPN', 'NW/NWPE', 'NW/NWPW', 'NW/CPN',
  'NW/CPS', 'NW/NCP', 'NW/UVA', 'NW/SAB', 'NW/SPE',
  'NW/SPW', 'NW/WPS', 'NW/EP', 'NW/NP-1', 'NW/NP-2'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/* ================= COMPONENT ================= */
type ApiResponse = {
  msan: PlatformRecord[];
  vpn: PlatformRecord[];
  slbn: PlatformRecord[];
  routine: RoutineRecord[];
};

@Component({
  selector: 'app-routine-mtnc',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './routine-mtnc.component.html',
  styleUrls: ['./routine-mtnc.component.scss']
})
export class RoutineMtncComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  pageTitle = 'Routine Maintenance';
  heroSubtitle = 'Monitor routine maintenance schedules, node-level compliance, and performance metrics across platforms.';

  readonly columns = PLATFORM_COLUMNS;
  readonly combinedTableStaticColumns = 8;

  readonly platformConfigs: PlatformTableConfig[] = [
    { key: 'msan', title: 'MSAN Data Table', monthsLimit: 6 },
    { key: 'vpn', title: 'VPN Data Table', monthsLimit: 2 },
    { key: 'slbn', title: 'SLBN Data Table', monthsLimit: 2 }
  ];

  loading = false;
  errorMessage = '';

  routineData: RoutineRecord[] = [];

  platformDataMap: Record<PlatformKey, PlatformRecord[]> = {
    msan: [],
    vpn: [],
    slbn: []
  };

  placeholderMap: Record<PlatformKey, PlaceholderMap> = {
    msan: this.buildDefaultPlaceholders(),
    vpn: this.buildDefaultPlaceholders(),
    slbn: this.buildDefaultPlaceholders()
  };

  towerSumsMap: Record<PlatformKey, TowerSumRecord> = {
    msan: {},
    vpn: {},
    slbn: {}
  };

  /* ===================== FILTER STATE ===================== */

  private readonly now = new Date();

  selectedMonth: number = this.now.getMonth() + 1;   // 1-indexed (1 = January)
  selectedYear: number = this.now.getFullYear();

  readonly monthOptions: { value: number; label: string }[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  yearOptions: number[] = [
    this.now.getFullYear(),
    this.now.getFullYear() - 1,
    this.now.getFullYear() - 2
  ];

  /* -------------------- */

  ngOnInit(): void {
    this.fetchData();
  }

  /* ===================== FILTER HANDLERS ===================== */

  onMonthChange(month: number): void {
    this.selectedMonth = Number(month);
    // Request filtered data from backend for selected month and year
    this.fetchData();
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.fetchData();
  }

  private applyFiltersAndRecalculate(): void {
    (['msan', 'vpn', 'slbn'] as PlatformKey[]).forEach(key => {
      this.placeholderMap[key] = this.calculatePlaceholderValues(this.platformDataMap[key], key);
      const cfg = this.platformConfigs.find(c => c.key === key);
      this.towerSumsMap[key] = cfg
        ? this.calculateTowerSums(this.platformDataMap[key], cfg.monthsLimit)
        : {};
    });
    this.cdr.detectChanges();
  }

  /* ================= GETTERS ================= */

  get maintenanceRows(): MaintenanceRow[] {
    return this.routineData.map(routine => {
      const kpiLower = (routine.kpi ?? '').toLowerCase();
      const platformLower = (routine.platform ?? '').toLowerCase();
      const combined = `${kpiLower}|${platformLower}`.replace(/[\s&]/g, '');
      let platformKey: PlatformKey | null = null;

      if (combined.includes('slbn') || combined.includes('slb')) {
        platformKey = 'slbn';
      } else if (combined.includes('ipnw') || combined.includes('vpn')) {
        platformKey = 'vpn';
      } else if (combined.includes('msan') || combined.includes('olte')) {
        platformKey = 'msan';
      }

      return { routine, platformKey };
    });
  }

  get combinedTableColspan(): number {
    return this.combinedTableStaticColumns + this.columns.length;
  }

  /* ================= API ================= */

  fetchData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      msan: this.http.get<PlatformRecord[]>(`${environment.apiUrl}/multi-table/fetchMsan?year=${this.selectedYear}`).pipe(catchError(() => of([]))),
      vpn: this.http.get<PlatformRecord[]>(`${environment.apiUrl}/multi-table/fetchVpn?year=${this.selectedYear}`).pipe(catchError(() => of([]))),
      slbn: this.http.get<PlatformRecord[]>(`${environment.apiUrl}/multi-table/fetchSlbn?year=${this.selectedYear}`).pipe(catchError(() => of([]))),
      routine: this.http.get<RoutineRecord[]>(`${environment.apiUrl}/mtnc-routine`).pipe(
        catchError((err: HttpErrorResponse) => {
          console.error(err.message);
          this.setError('Unable to load routine KPI definitions.');
          return of([]);
        })
      )
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe((response: ApiResponse) => {
        const { msan, vpn, slbn, routine } = response;
        this.platformDataMap = { msan, vpn, slbn };
        this.routineData = routine ?? [];

        (['msan', 'vpn', 'slbn'] as PlatformKey[]).forEach(key => {
          this.placeholderMap[key] = this.calculatePlaceholderValues(this.platformDataMap[key], key);
          const cfg = this.platformConfigs.find(c => c.key === key);
          this.towerSumsMap[key] = cfg
            ? this.calculateTowerSums(this.platformDataMap[key], cfg.monthsLimit)
            : {};
        });
      });
  }

  /* ================= TEMPLATE METHODS ================= */

  getPlatformRecords(key: PlatformKey): PlatformRecord[] {
    return this.platformDataMap[key] ?? [];
  }

  exportToExcel(): void {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Routine Maintenance');

    const headers = [
      'No', 'KPI', 'Target', 'Calculation', 'Platform',
      'Responsible DGM', 'Defined OLA Details', 'Data Sources',
      ...this.columns
    ];

    worksheet.addRow(headers);

    this.maintenanceRows.forEach(row => {
      worksheet.addRow([
        row.routine.no ?? '',
        row.routine.kpi ?? '',
        row.routine.target ?? '',
        row.routine.calculation ?? '',
        row.routine.platform ?? '',
        row.routine.responsibleDGM ?? '',
        row.routine.definedOLADetails ?? '',
        row.routine.dataSources ?? '',
        ...this.columns.map(c => this.placeholderMap[row.platformKey!]?.[c] ?? '')
      ]);
    });

    workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Routine_Maintenance_KPI.xlsx';
      link.click();
    });

  }

  /* ================= HELPERS ================= */

  formatRoutineValue(value?: string): string {
    return value?.trim() || 'No data';
  }

  formatPlaceholderValue(platformKey: PlatformKey | null, column: string): string {
    if (!platformKey) return 'No data';
    return `${this.placeholderMap[platformKey]?.[column] ?? '0.00'}%`;
  }


  getDetailValue(
    record: PlatformRecord,
    column: string,
    field: 'column2' | 'column3'
  ): string {

    if (!record || !record.data) return 'No data';

    const key = Object.keys(record.data).find(
      k => k.trim().toLowerCase() === column.trim().toLowerCase()
    );

    if (!key) return 'No data';

    return record.data[key]?.[field]?.toString() ?? 'No data';
  }


  /*getDetailValue(record: PlatformRecord, column: string, field: 'Column2' | 'Column3'): string {
    const detail = record.details?.find(d => d.Column1 === column);
    const val = detail?.[field];
    return val === undefined || val === null || val === '' ? 'No data' : String(val);
  }*/

  getTowerSum(key: PlatformKey, column: string): number {
    return this.towerSumsMap[key]?.[column] ?? 0;
  }

  trackByMaintenanceRow = (_: number, item: MaintenanceRow) =>
    `${item.routine.no}-${item.platformKey}`;
  trackByColumn = (_: number, column: string) => column;
  trackByMonth = (_: number, record: PlatformRecord) => record.month;

  /* ================= CALCULATIONS ================= */

  private buildDefaultPlaceholders(): PlaceholderMap {
    const map: PlaceholderMap = {};
    PLATFORM_COLUMNS.forEach(c => (map[c] = '100.00'));
    return map;
  }

  private calculatePlaceholderValues(data: PlatformRecord[], platform: PlatformKey): PlaceholderMap {
    const result = this.buildDefaultPlaceholders();
    if (!data.length) return result;

    const months = this.getTargetMonths(platform);
    if (!months.length) return result;

    const selectedMonthLabel = this.monthOptions.find(m => m.value === this.selectedMonth)?.label ?? '';
    const selectedMonthIndex = this.selectedMonth - 1;

    // Prefer the exact selected month entry; otherwise fall back to the latest
    // available month in the selected window that is on or before the selected month.
    const exactEntry = data.find(d => d.month === selectedMonthLabel);
    const targetEntry = exactEntry
      || months
        .filter(m => MONTH_NAMES.indexOf(m) <= selectedMonthIndex)
        .reverse()
        .map(m => data.find(d => d.month === m))
        .find(entry => entry !== undefined);

    if (!targetEntry) return result;

    this.applyCumulativePercentage(result, targetEntry);
    return result;
  }

  private applyCumulativePercentage(result: PlaceholderMap, entry: PlatformRecord): void {
    PLATFORM_COLUMNS.forEach(column => {
      const detail = entry.data?.[column];
      const cumSched = Number(detail?.column2) || 0; // CumulativeSched
      const cumAchieved = Number(detail?.column3) || 0; // CumulativeAchieved
      result[column] = cumSched ? ((cumAchieved / cumSched) * 100).toFixed(2) : '0.00';
    });
  }

  private calculateTowerSums(data: PlatformRecord[], limit: number): TowerSumRecord {
    const sums: TowerSumRecord = {};

    data.slice(0, limit).forEach(entry => {
      Object.keys(entry.data || {}).forEach(key => {
        const val = entry.data[key]?.column2;
        sums[key] = (sums[key] ?? 0) + (val ? Number(val) : 0);
      });
    });

    return sums;
  }

  private getTargetMonths(platform: PlatformKey): string[] {
    if (platform === 'msan') {
      // Use the half-year that contains the selected month
      if (this.selectedMonth >= 1 && this.selectedMonth <= 6) {
        return MONTH_NAMES.slice(0, 6);   // Jan–Jun
      }
      return MONTH_NAMES.slice(6);      // Jul–Dec (7..12)
    }

    // VPN and SLBN: two-month windows (Jan-Feb, Mar-Apr, ...)
    const monthIndex = this.selectedMonth - 1;
    if (monthIndex < 0 || monthIndex > 11) return [];

    const startIndex = monthIndex % 2 === 0 ? monthIndex : monthIndex - 1;
    return [MONTH_NAMES[startIndex], MONTH_NAMES[startIndex + 1]];
  }

  private setError(msg: string): void {
    if (!this.errorMessage) this.errorMessage = msg;
  }
}
