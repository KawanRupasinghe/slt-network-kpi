import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { IpNwOpService, IpNwOpKpiDto, IpNwOpMetricPayload, IpNwOpMetric } from '../../../../services/ip-nw-op.service';
import { RegionService, Region } from '../../../../services/region.service';
import { AuthService } from '../../../../services/auth.service';
import { AgedNetworkFailureService } from '../../../../services/aged-network-failure.service';

const AGED_FAILURE_PLATFORM = 'IP_NW_OP';

interface RegionRow {
  region?: string;
  province?: string;
  networkEngineer?: string;
  lea?: string; // friendly string in DB like "AD / PR"
}


const LOCAL_REGION_TABLE: RegionRow[] = [
  { region: 'Region 3', province: 'NP', networkEngineer: 'NW/NP-2', lea: 'KOMLTMBVA' },
  { region: 'Region 3', province: 'NP', networkEngineer: 'NW/NP-1', lea: 'JA' },
  { region: 'Region 3', province: 'EP', networkEngineer: 'NW/EP', lea: 'BCAPKLTC' },
  { region: 'Region 2', province: 'WPS & SP', networkEngineer: 'NW/WPS', lea: 'HRKTPH' },
  { region: 'Region 2', province: 'WPS & SP', networkEngineer: 'NW/SPW', lea: 'AGGL' },
  { region: 'Region 2', province: 'WPS & SP', networkEngineer: 'NW/SPE', lea: 'EMBMBMH' },
  { region: 'Region 2', province: 'SAB & UVA', networkEngineer: 'NW/SAB', lea: 'KERN' },
  { region: 'Region 2', province: 'SAB & UVA', networkEngineer: 'NW/UVA', lea: 'BDBWMRG' },
  { region: 'Region 1', province: 'CP & NCP', networkEngineer: 'NW/NCP', lea: 'ADPR' },
  { region: 'Region 1', province: 'CP & NCP', networkEngineer: 'NW/CPS', lea: 'GPHTNW' },
  { region: 'Region 1', province: 'CP & NCP', networkEngineer: 'NW/CPN', lea: 'DBKYMT' },
  { region: 'Region 1', province: 'WPN & NWP', networkEngineer: 'NW/NWPW', lea: 'CWPX' },
  { region: 'Region 1', province: 'WPN & NWP', networkEngineer: 'NW/NWPE', lea: 'KGKLY' },
  { region: 'Region 1', province: 'WPN & NWP', networkEngineer: 'NW/WPN', lea: 'NGWT' },
  { region: 'Metro', province: 'Metro 2', networkEngineer: 'NWWPE', lea: 'KONKX' },
  { region: 'Metro', province: 'Metro 2', networkEngineer: 'NWWPSE', lea: 'AWHO' },
  { region: 'Metro', province: 'Metro 2', networkEngineer: 'NWWPSW', lea: 'NDRM' },
  { region: 'Metro', province: 'Metro 1', networkEngineer: 'NWWPNE', lea: 'GQKINTB' },
  { region: 'Metro', province: 'Metro 1', networkEngineer: 'NWWPC-2 (CEN/HK/MD)', lea: 'CENHKMD' },
  { region: 'Metro', province: 'Metro 1', networkEngineer: 'NWWPC-1 (CEN/HK/MD)', lea: 'CENHKMD1' },
];

@Component({
  selector: 'app-ip-nw-op',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ip-nw-op.component.html',
  styleUrls: ['./ip-nw-op.component.scss'],
})
export class IpNwOpComponent implements OnInit, OnDestroy {
  pageTitle = 'IP NW OP';

  data: IpNwOpKpiDto[] = [];
  metrics: IpNwOpMetric[] = [];
  regionTable: RegionRow[] = [...LOCAL_REGION_TABLE];

  loading = true;
  saving = false;
  error: string | null = null;

  agedFailureValues: Record<string, number> = {};
  agedFailureSaving = false;

  // Month/Year selection (current month default)
  selectedMonth: number = new Date().getMonth() + 1; // 1-12
  selectedYear: number = new Date().getFullYear();

  // current month days (recalculated when month/year changes)
  daysInMonth: number = this.getDaysInMonth(this.selectedYear, this.selectedMonth);

  // dropdown form
  formValues = {
    dropdown1: '', // Region
    dropdown2: '', // Province
    dropdown3: '', // Engineer
    dropdown4: '', // RTOM area db key (lowercase)
  };

  dropdown2Options: string[] = [];
  dropdown3Options: string[] = [];
  dropdown4Options: string[] = [];

  // edit cell state (nested key like "total_nodes.adipr")
  editCell: { rowId: number | null; key: string | null; value: string } = {
    rowId: null,
    key: null,
    value: '',
  };

  // simple toast system (no external lib)
  toasts: Array<{ id: number; type: 'success' | 'danger'; text: string }> = [];
  private toastId = 1;

  // ---- IP NW OP mapping (DB keys are lowercase) ----
  optionMapping: Record<string, string> = {
    cenhkmd: 'CEN/HK/MD',
    cenhkmd1: 'CEN/HK/MD',
    gqkintb: 'GQ / KI / NTB',
    ndfrm: 'ND / RM',
    awho: 'AW / HO',
    konix: 'KON / KX',
    ngivt: 'NG / WT',
    kgkly: 'KG / KLY',
    cwpx: 'CW / PX',
    debkymt: 'DB / KY / MT',
    gphtnw: 'GP / HT / NW',
    adipr: 'AD / PR',
    bddwmrg: 'BD / BW / MRG',
    keirn: 'KE / RN',
    embmbmh: 'EMB / HB / MH',
    aggl: 'AG / GL',
    hrktph: 'HR / KT / PH',
    bcjrdkltc: 'BC / AP / KL / TC',
    ja: 'JA',
    komltmbva: 'KO / MLT / MB / VA',
  };

  // friendly -> dbKey (built once)
  private friendlyToDbKey: Record<string, string> = {};
  private filtersInitialized = false;

  constructor(
    private http: HttpClient,
    private ipNwOpService: IpNwOpService,
    private regionService: RegionService,
    private authService: AuthService,
    private agedFailureService: AgedNetworkFailureService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.buildFriendlyMap();
    this.loadRegionTable();
    this.initializeFilters();
    this.loadData();
    this.loadAgedFailureData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  get isEditingAllowed(): boolean {
    return this.authService.canEditPage('IP NW OP');
  }

  // -------------------------
  // Helpers
  // -------------------------
  private norm(s: any): string {
    return s ? String(s).replace(/[^A-Za-z0-9]/g, '').toLowerCase() : '';
  }

  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private buildFriendlyMap(): void {
    const out: Record<string, string> = {};
    Object.keys(this.optionMapping).forEach((dbKey) => {
      out[this.norm(this.optionMapping[dbKey])] = dbKey;
      out[this.norm(dbKey)] = dbKey;
    });
    this.friendlyToDbKey = out;
  }

  private showToast(type: 'success' | 'danger', text: string): void {
    const id = this.toastId++;
    this.toasts.push({ id, type, text });
    setTimeout(() => this.dismissToast(id), 2600);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  // Selected RTOM db key (lowercase)
  get selectedKey(): string {
    return this.formValues.dropdown4 ? this.norm(this.formValues.dropdown4) : '';
  }

  // Regions list
  get regions(): string[] {
    return Array.from(new Set(this.regionTable.map((r) => r.region).filter(Boolean) as string[]));
  }

  get hasAreaFilter(): boolean {
    return !!this.selectedKey;
  }

  get canEditMetrics(): boolean {
    return this.isEditingAllowed && this.hasAreaFilter;
  }

  get selectedAreaLabel(): string {
    const key = this.formValues.dropdown4;
    if (!key) return '';
    return this.optionMapping[key] || key.toUpperCase();
  }

  getAreaPercentage(entry: IpNwOpKpiDto): string {
    if (!this.selectedKey) return '-';

    // Find metric for this KPI and area
    const metric = this.metrics.find(
      m => m.ip_nw_op_kpi_id === entry.id && m.area_code === this.selectedKey
    );

    if (!metric || metric.total_minutes === undefined || metric.unavailable_minutes === undefined || metric.total_nodes === undefined) {
      return '-';
    }

    const pct = this.calculatePercentage(metric.total_minutes, metric.unavailable_minutes, metric.total_nodes);
    return Number.isFinite(pct) ? `${pct.toFixed(2)}%` : '-';
  }

  getAreaMetric(
    entry: IpNwOpKpiDto,
    bucket: 'total_minutes' | 'unavailable_minutes' | 'total_nodes'
  ): string {
    if (!this.selectedKey) return '-';

    // Find metric for this KPI and area
    const metric = this.metrics.find(
      m => m.ip_nw_op_kpi_id === entry.id && m.area_code === this.selectedKey
    );

    if (!metric) return '-';

    const value = metric[bucket];
    return value === undefined || value === null ? '-' : String(value);
  }

  private buildPayload(entry: IpNwOpKpiDto): IpNwOpKpiDto {
    return { ...entry };
  }

  private normalizeMetricDict(
    source?: Record<string, string | number | undefined | null>
  ): Record<string, number | null> {
    if (!source) return {};

    return Object.entries(source).reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') return acc;
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numeric)) return acc;
      acc[key] = numeric;
      return acc;
    }, {} as Record<string, number | null>);
  }

  // -------------------------
  // API Calls
  // -------------------------
  // Legacy auth methods removed

  loadRegionTable(): void {
    this.regionService.getAll().subscribe({
      next: (res: Region[] | any[]) => {
        const source = Array.isArray(res) ? res : [];
        const mapped: RegionRow[] = source.map((item: any) => ({
          region: item.region ?? item.Region ?? '',
          province: item.province ?? item.Province ?? '',
          networkEngineer: item.networkEngineer ?? item.networkengineer ?? item.NetworkEngineer ?? '',
          lea: item.lea ?? item.leacode ?? item.leaCode ?? item.LEA ?? ''
        }));
        this.regionTable = mapped.length ? mapped : [...LOCAL_REGION_TABLE];
        this.initializeFilters();
      },
      error: (err) => {
        console.error('Failed to fetch region table:', err);
        this.regionTable = [...LOCAL_REGION_TABLE];
        this.initializeFilters();
      },
    });
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.metrics = [];

    // Pass area parameter if selected
    const areaParam = this.selectedKey || undefined;

    this.ipNwOpService.getAll(this.selectedMonth, this.selectedYear, areaParam).subscribe({
      next: (records) => {
        this.data = Array.isArray(records) ? (records as IpNwOpKpiDto[]) : [];
        this.metrics = this.selectedKey ? this.buildMetricsFromKpis(this.data, this.selectedKey) : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load IP NW OP admin data:', err);
        this.data = [];
        this.loading = false;
        this.error = 'Failed to load IP NW OP KPI data.';
        this.cdr.detectChanges();
      }
    });
  }

  private buildMetricsFromKpis(entries: IpNwOpKpiDto[], areaKey: string): IpNwOpMetric[] {
    const key = this.norm(areaKey);
    if (!key) return [];

    return entries.map((entry) => {
      const unavailable = entry.unavailable_minutes?.[key] ?? null;
      const totalMinutes = entry.total_minutes?.[key] ?? null;
      const totalNodes = entry.total_nodes?.[key] ?? null;

      return {
        ip_nw_op_kpi_id: entry.id,
        area_code: key,
        month: this.selectedMonth,
        year: this.selectedYear,
        unavailable_minutes: unavailable,
        total_minutes: totalMinutes,
        total_nodes: totalNodes,
      } as IpNwOpMetric;
    });
  }

  isAgedFailureKpi(name: string): boolean {
    return name?.includes('Unavailability of Aged Network Failures') ?? false;
  }

  getAgedFailureValue(areaCode: string): number {
    return this.agedFailureValues[areaCode] ?? 0;
  }

  setAgedFailureValue(areaCode: string, value: number): void {
    this.agedFailureValues[areaCode] = value;
  }

  async saveAgedFailure(areaCode: string): Promise<void> {
    if (!areaCode) return;
    this.agedFailureSaving = true;
    try {
      const result: any = await firstValueFrom(this.agedFailureService.upsert({
        areaCode,
        platformType: AGED_FAILURE_PLATFORM,
        hasUnavailability: this.agedFailureValues[areaCode] ?? 0,
        month: this.selectedMonth,
        year: this.selectedYear,
      }));
      this.showToast('success', result?.message ?? 'Saved successfully.');
    } catch {
      this.showToast('danger', 'Failed to save Has Unavailability.');
    } finally {
      this.agedFailureSaving = false;
    }
  }

  private loadAgedFailureData(): void {
    const key = this.selectedKey;
    if (!key) return;
    this.agedFailureService
      .get(key, this.selectedMonth, this.selectedYear, AGED_FAILURE_PLATFORM)
      .subscribe({
        next: (rows) => {
          rows.forEach((r) => {
            const k = r.areaCode?.replace(/[^A-Za-z0-9]/g, '').toLowerCase() ?? '';
            if (k) this.agedFailureValues[k] = r.hasUnavailability;
          });
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  onMonthYearChange(): void {
    // Update daysInMonth when month/year changes
    this.daysInMonth = this.getDaysInMonth(this.selectedYear, this.selectedMonth);
    // Reset editing state
    this.cancelEdit();
    // Reload data with new month/year
    this.loadData();
    this.loadAgedFailureData();
  }

  // -------------------------
  // Dropdown cascading
  // -------------------------
  private updateDropdown2Options(region: string): void {
    if (!region) {
      this.dropdown2Options = [];
      return;
    }
    const provinces = Array.from(
      new Set(
        this.regionTable
          .filter((x) => x.region === region)
          .map((x) => x.province)
          .filter(Boolean) as string[]
      )
    );
    this.dropdown2Options = provinces;
  }

  private updateDropdown3Options(province: string): void {
    if (!province || !this.formValues.dropdown1) {
      this.dropdown3Options = [];
      return;
    }
    const engineers = Array.from(
      new Set(
        this.regionTable
          .filter((x) => x.region === this.formValues.dropdown1 && x.province === province)
          .map((x) => x.networkEngineer)
          .filter(Boolean) as string[]
      )
    );
    this.dropdown3Options = engineers;
  }

  private updateDropdown4Options(engineer: string): void {
    if (!engineer || !this.formValues.dropdown1 || !this.formValues.dropdown2) {
      this.dropdown4Options = [];
      return;
    }

    const leas = Array.from(
      new Set(
        this.regionTable
          .filter(
            (x) =>
              x.region === this.formValues.dropdown1 &&
              x.province === this.formValues.dropdown2 &&
              x.networkEngineer === engineer
          )
          .map((x) => this.friendlyToDbKey[this.norm(x.lea)] || this.norm(x.lea))
          .filter(Boolean)
      )
    );

    this.dropdown4Options = leas;
  }

  private initializeFilters(): void {
    if (this.filtersInitialized) return;

    // Don't auto-select, leave all as empty strings
    this.formValues.dropdown1 = '';
    this.formValues.dropdown2 = '';
    this.formValues.dropdown3 = '';
    this.formValues.dropdown4 = '';

    this.filtersInitialized = true;
  }

  onDropdownChange(name: 'dropdown1' | 'dropdown2' | 'dropdown3' | 'dropdown4', value: string): void {
    if (name === 'dropdown1') {
      this.formValues.dropdown1 = value;
      this.formValues.dropdown2 = '';
      this.formValues.dropdown3 = '';
      this.formValues.dropdown4 = '';

      this.updateDropdown2Options(value);
      this.dropdown3Options = [];
      this.dropdown4Options = [];
      this.cancelEdit();
      this.loadData();
      return;
    }

    if (name === 'dropdown2') {
      this.formValues.dropdown2 = value;
      this.formValues.dropdown3 = '';
      this.formValues.dropdown4 = '';

      this.updateDropdown3Options(value);
      this.dropdown4Options = [];
      this.cancelEdit();
      this.loadData();
      return;
    }

    if (name === 'dropdown3') {
      this.formValues.dropdown3 = value;
      this.formValues.dropdown4 = '';

      this.updateDropdown4Options(value);
      this.cancelEdit();
      this.loadData();
      return;
    }

    // dropdown4 - Area changed
    this.formValues.dropdown4 = value;
    this.cancelEdit();
    this.loadData();
    this.loadAgedFailureData();
  }

  // -------------------------
  // KPI calculations
  // -------------------------
  calculatePercentage(totalMinutes: any, unavailableMinutes: any, totalNodes: any): number {
    const tm = Number(totalMinutes) || 0;
    const um = Number(unavailableMinutes) || 0;
    const tn = Number(totalNodes) || 0;

    const totalAvailableMinutes = tm - um;
    const totalMin = 24 * 60 * this.daysInMonth * tn;
    if (totalMin <= 0) return 100;
    return (100 * totalAvailableMinutes) / totalMin;
  }

  // -------------------------
  // Editing
  // -------------------------
  startEdit(entry: IpNwOpKpiDto, key: 'unavailable_minutes' | 'total_minutes' | 'total_nodes'): void {
    if (!this.canEditMetrics) return;

    const k = this.selectedKey;
    const nestedKey = `${key}.${k}`;

    // Find the current metric value
    const metric = this.metrics.find(
      m => m.ip_nw_op_kpi_id === entry.id && m.area_code === k
    );

    const currentVal = metric ? metric[key] : null;

    this.editCell = {
      rowId: entry.id,
      key: nestedKey,
      value: currentVal === undefined || currentVal === null ? '' : String(currentVal),
    };
  }

  onEditInput(value: string | number | null | undefined): void {
    const normalizedValue = value === null || value === undefined ? '' : String(value);
    this.editCell = { ...this.editCell, value: normalizedValue };
  }

  async doneEdit(): Promise<void> {
    if (!this.canEditMetrics || this.editCell.rowId === null || !this.editCell.key || this.saving) {
      return;
    }

    const [parentKey, childKey] = this.editCell.key.split('.');
    if (!parentKey || !childKey) {
      this.cancelEdit();
      return;
    }

    const newValue = this.editCell.value.trim();
    const numericValue = newValue === '' ? null : Number(newValue);
    const nextValue =
      numericValue === null || Number.isFinite(numericValue) ? numericValue : null;

    const kpiId = this.editCell.rowId;
    this.cancelEdit();

    const payload: IpNwOpMetricPayload = {};
    if (parentKey === 'unavailable_minutes') payload.unavailableMinutes = nextValue;
    else if (parentKey === 'total_minutes') payload.totalMinutes = nextValue;
    else if (parentKey === 'total_nodes') {
      payload.totalNodes = nextValue;
      const autoTotalMinutes =
        nextValue === null ? null : Math.round(24 * 60 * this.daysInMonth * Number(nextValue));
      payload.totalMinutes = autoTotalMinutes;
    }

    try {
      this.saving = true;
      await firstValueFrom(
        this.ipNwOpService.upsertMetric(kpiId, childKey, this.selectedMonth, this.selectedYear, payload)
      );
      this.showToast('success', 'Metric updated successfully.');
      const areaCode = this.norm(childKey);
      let metric = this.metrics.find(
        (m) => m.ip_nw_op_kpi_id === kpiId && m.area_code === areaCode
      );

      if (!metric) {
        metric = {
          ip_nw_op_kpi_id: kpiId,
          area_code: areaCode,
          month: this.selectedMonth,
          year: this.selectedYear,
        } as IpNwOpMetric;
        this.metrics = [...this.metrics, metric];
      }

      if (payload.unavailableMinutes !== undefined) {
        metric.unavailable_minutes = payload.unavailableMinutes ?? null;
      }
      if (payload.totalMinutes !== undefined) {
        metric.total_minutes = payload.totalMinutes ?? null;
      }
      if (payload.totalNodes !== undefined) {
        metric.total_nodes = payload.totalNodes ?? null;
      }
    } catch (error) {
      console.error('Failed to persist metric change:', error);
      this.showToast('danger', 'Failed to save change. Reloading latest data.');
      this.loadData();
    } finally {
      this.saving = false;
    }
  }

  cancelEdit(): void {
    this.editCell = { rowId: null, key: null, value: '' };
  }

  isCellEditing(
    rowId: number,
    bucket: 'unavailable_minutes' | 'total_minutes' | 'total_nodes'
  ): boolean {
    if (!this.selectedKey || !this.editCell.key) return false;
    return this.editCell.rowId === rowId && this.editCell.key === `${bucket}.${this.selectedKey}`;
  }

  handleEditKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.doneEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  // -------------------------
  // Save All
  // -------------------------
  // -------------------------
  // Excel Export (same structure as React)
  // -------------------------
  async exportToExcel(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Network Availability');

    const areas = Object.keys(this.optionMapping);

    ws.addRow(['KPI (NW Availability - IP Core NW / BSR NW / Service Edge NW)']);
    ws.addRow([`Generated Date: ${new Date().toISOString().split('T')[0]}`]);
    ws.addRow([]);

    const headers = [
      'No',
      'Network Engineer KPI',
      'Division',
      'Section',
      'KPI Percent',
      ...areas.map((a) => this.optionMapping[a] || a),
    ];

    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    this.data.forEach((entry) => {
      const row: any[] = [
        entry.id,
        entry.network_engineer_kpi,
        entry.division,
        entry.section,
        entry.kpi_percent,
      ];

      areas.forEach((a) => {
        // Metrics are now stored separately, placeholder for now
        row.push('');
      });

      const r = ws.addRow(row);
      r.eachCell((cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Sub-rows (placeholders for metrics)
      const tm: any[] = ['', 'Total Minutes', '', '', ''];
      const um: any[] = ['', 'Unavailable Minutes', '', '', ''];
      const tn: any[] = ['', 'Total Nodes', '', '', ''];

      areas.forEach((a) => {
        // Metrics are now stored separately
        tm.push('');
        um.push('');
        tn.push('');
      });

      [tm, um, tn].forEach((arr) => {
        const rr = ws.addRow(arr);
        rr.eachCell((cell: ExcelJS.Cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });
    });

    ws.columns.forEach((column: Partial<ExcelJS.Column>) => {
      if (column) {
        column.width = 15;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `KPI_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();

    URL.revokeObjectURL(link.href);
  }
}

