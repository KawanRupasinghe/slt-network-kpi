import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Directive, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import * as XLSX from 'xlsx';
import {
  OtherKpiDto,
  OtherKpiPlatformService,
  OtherMetricDto,
  UpsertOtherMetricRequest
} from '../../../../services/other-kpi-platform.service';
import { Region, RegionService } from '../../../../services/region.service';
import { AuthService } from '../../../../services/auth.service';

type MetricKey =
  | 'totalFaults'
  | 'faultsWithinSla'
  | 'repeatedFaults'
  | 'totalCustomers'
  | 'totalClearanceFaults'
  | 'clearedWithin4Hrs';

type KpiRow = OtherKpiDto & {
  no: number;
  kpiId: number;
  metricId?: number | string;
  site?: string;
  totalFaults?: number | null;
  faultsWithinSla?: number | null;
  repeatedFaults?: number | null;
  totalCustomers?: number | null;
  totalClearanceFaults?: number | null;
  clearedWithin4Hrs?: number | null;
};

interface RegionData {
  region: string;
  province: string;
  networkEngineer: string;
  lea: string;
}

export interface OtherKpiMetricsService {
  getAll(): import('rxjs').Observable<OtherKpiDto[]>;
  getMetrics(month: number, year: number, site?: string): import('rxjs').Observable<OtherMetricDto[]>;
  upsertMetric(request: UpsertOtherMetricRequest): import('rxjs').Observable<OtherMetricDto>;
}

@Directive()
export abstract class BaseOtherKpiMetricsComponent implements OnInit {
  pageTitle: string;

  formValues = { dropdown1: '', dropdown2: '', dropdown3: '', dropdown4: '' };
  regionTable: RegionData[] = [];
  dropdown2Options: string[] = [];
  dropdown3Options: string[] = [];
  dropdown4Options: string[] = [];

  adminKpiRows: KpiRow[] = [];
  data: KpiRow[] = [];
  metricsRows: OtherMetricDto[] = [];

  loading = true;
  metricsLoading = false;
  error: string | null = null;
  isEditingAllowed = false;
  editingCell: { rowId: number | string | null; key: MetricKey | null } = { rowId: null, key: null };
  activeEditValue = '';
  private editingMessageShown = false;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  yearOptions: number[] = [];

  readonly monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  readonly metricColumns: Array<{ key: MetricKey; label: string }> = [
    { key: 'totalFaults', label: 'Total Faults' },
    { key: 'faultsWithinSla', label: 'Faults Within SLA' },
    { key: 'repeatedFaults', label: 'Repeated Faults' },
    { key: 'totalCustomers', label: 'Total Customers' },
    { key: 'totalClearanceFaults', label: 'Total Clearance Faults' },
    { key: 'clearedWithin4Hrs', label: 'Cleared Within 4 Hrs' }
  ];

  readonly optionMapping: { [key: string]: string } = {
    CENHK: 'CEN/HK', CENMD: 'CEN/MD', GQKINTB: 'GQ/KI/NTB', NDRM: 'ND/RM', AWHO: 'AW/HO',
    KONKX: 'KON/KX', KONIX: 'KON/KX', NGWT: 'NG/WT', NGIVT: 'NG/WT', KGKLY: 'KG/KLY',
    CWPX: 'CW/PX', KYMT: 'KY/MT', GPHTNW: 'GP/HT/NW', ADPR: 'AD/PR', ADIPR: 'AD/PR',
    BDBWMRG: 'BD/BW/MRG', BDDWMRG: 'BD/BW/MRG', KERN: 'KE/RN', KEIRN: 'KE/RN',
    EMBHBMH: 'EMB/HB/MH', EMBMBMH: 'EMB/HB/MH', AGGL: 'AG/GL', HRKTPH: 'HR/KT/PH',
    BCAPKLTC: 'BC/AP/KL/TC', BCJRDKLTC: 'BC/AP/KL/TC', JA: 'JA', KOMLTMBVA: 'KO/MLT/MB/VA'
  };

  private readonly fallbackRegions: RegionData[] = [
    { region: 'metro', province: 'metro 1', networkEngineer: 'NW/WPC1', lea: 'CEN/HK' },
    { region: 'metro', province: 'metro 1', networkEngineer: 'NW/WPC2', lea: 'CEN/MD' },
    { region: 'metro', province: 'metro 1', networkEngineer: 'NW/WPE', lea: 'KON/KX' },
    { region: 'metro', province: 'metro 2', networkEngineer: 'NW/WP S-W', lea: 'ND/RM' },
    { region: 'metro', province: 'metro 2', networkEngineer: 'NW/WP S-E', lea: 'AW/HO' },
    { region: 'Region01', province: 'WPN', networkEngineer: 'NW/WPN', lea: 'NG/WT' },
    { region: 'Region01', province: 'WPN', networkEngineer: 'NW/WP N-E', lea: 'GQ/KI/NTB' },
    { region: 'Region01', province: 'NWP', networkEngineer: 'NW/NWP-E', lea: 'KG/KLY' },
    { region: 'Region01', province: 'NWP', networkEngineer: 'NW/NWP-W', lea: 'CW/PX' },
    { region: 'Region01', province: 'CP', networkEngineer: 'NW/CPN', lea: 'KY/MT' },
    { region: 'Region01', province: 'CP', networkEngineer: 'NW/CPS', lea: 'GP/HT/NW' },
    { region: 'Region02', province: 'SAB & UVA', networkEngineer: 'NW/UVA', lea: 'BD/BW/MRG' },
    { region: 'Region02', province: 'SAB & UVA', networkEngineer: 'NW/SAB', lea: 'KE/RN' },
    { region: 'Region02', province: 'SP', networkEngineer: 'NW/SPE', lea: 'EMB/HB/MH' },
    { region: 'Region02', province: 'SP', networkEngineer: 'NW/SPW', lea: 'AG/GL' },
    { region: 'Region02', province: 'WPS', networkEngineer: 'WPS', lea: 'HR/KT/PH' },
    { region: 'Region03', province: 'EP', networkEngineer: 'NW/EP', lea: 'BC/AP/KL/TC' },
    { region: 'Region03', province: 'NP', networkEngineer: 'NW/NP-1', lea: 'JA' },
    { region: 'Region03', province: 'NP', networkEngineer: 'NW/NP-2', lea: 'KO/MLT/MB/VA' },
    { region: 'Region 3', province: 'NP', networkEngineer: 'NW/NCP', lea: 'AD/PR' }
  ];

  constructor(
    pageTitle: string,
    private readonly pageAccessName: string,
    private toastr: ToastrService,
    private otherKpiService: OtherKpiMetricsService,
    private regionService: RegionService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.pageTitle = pageTitle;
    this.yearOptions = this.generateYearOptions();
  }

  ngOnInit(): void {
    this.loadRegionTable();
    this.loadData();
    this.recomputeEditPermission();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.otherKpiService.getAll().subscribe({
      next: (kpis) => {
        this.adminKpiRows = (Array.isArray(kpis) ? kpis : []).map((kpi, index) => ({
          ...kpi,
          no: index + 1,
          kpiId: Number(kpi.id)
        }));
        this.loading = false;
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Failed to load Other KPI data:', err);
        this.adminKpiRows = [];
        this.data = [];
        this.loading = false;
        this.error = 'Failed to load Other KPI data.';
        this.cdr.detectChanges();
      }
    });
  }

  loadMetrics(): void {
    const month = Number(this.selectedMonth);
    const year = Number(this.selectedYear);
    const site = this.resolveAreaCode(this.formValues.dropdown4);
    if (!month || !year) return;

    this.metricsLoading = true;
    this.otherKpiService.getMetrics(month, year, site || undefined).subscribe({
      next: (metrics) => {
        this.metricsRows = Array.isArray(metrics) ? metrics : [];
        this.rebuildRows();
        this.metricsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load Other KPI metrics:', err);
        this.metricsRows = [];
        this.rebuildRows();
        this.metricsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadRegionTable(): void {
    this.regionService.getAll().subscribe({
      next: (res: Region[] | any[]) => {
        const mapped = (Array.isArray(res) ? res : []).map((item: any) => ({
          region: item.region ?? item.Region ?? '',
          province: item.province ?? item.Province ?? '',
          networkEngineer: item.networkEngineer ?? item.networkengineer ?? item.NetworkEngineer ?? '',
          lea: item.lea ?? item.leacode ?? item.leaCode ?? item.LEA ?? ''
        }));
        this.regionTable = mapped.length ? mapped : [...this.fallbackRegions];
      },
      error: () => {
        this.regionTable = [...this.fallbackRegions];
      }
    });
  }

  getUniqueRegions(): string[] {
    return Array.from(new Set(this.regionTable.map(r => r.region))).filter(Boolean);
  }

  updateDropdown2Options(): void {
    this.dropdown2Options = Array.from(new Set(this.regionTable.filter(x => x.region === this.formValues.dropdown1).map(x => x.province))).filter(Boolean);
    this.formValues.dropdown2 = '';
    this.formValues.dropdown3 = '';
    this.formValues.dropdown4 = '';
    this.dropdown3Options = [];
    this.dropdown4Options = [];
    this.loadMetrics();
  }

  updateDropdown3Options(): void {
    this.dropdown3Options = Array.from(new Set(this.regionTable.filter(x => x.region === this.formValues.dropdown1 && x.province === this.formValues.dropdown2).map(x => x.networkEngineer))).filter(Boolean);
    this.formValues.dropdown3 = '';
    this.formValues.dropdown4 = '';
    this.dropdown4Options = [];
    this.loadMetrics();
  }

  updateDropdown4Options(): void {
    this.dropdown4Options = Array.from(new Set(this.regionTable
      .filter(x => x.region === this.formValues.dropdown1 && x.province === this.formValues.dropdown2 && x.networkEngineer === this.formValues.dropdown3)
      .map(x => this.resolveAreaCode(x.lea))
      .filter(Boolean)));
    this.formValues.dropdown4 = '';
    this.loadMetrics();
  }

  onDropdownChange(field: string, value: string): void {
    (this.formValues as any)[field] = field === 'dropdown4' ? this.resolveAreaCode(value) : value;
    if (field === 'dropdown1') this.updateDropdown2Options();
    if (field === 'dropdown2') this.updateDropdown3Options();
    if (field === 'dropdown3') this.updateDropdown4Options();
    if (field === 'dropdown4') this.loadMetrics();
    this.recomputeEditPermission();
  }

  onPeriodChange(): void {
    this.loadMetrics();
  }

  startEdit(row: KpiRow, key: MetricKey): void {
    if (!this.canEditMetrics()) {
      if (!this.editingMessageShown) {
        this.toastr.info('Select an RTOM area and make sure you have edit permission.', 'Edit Disabled');
        this.editingMessageShown = true;
        setTimeout(() => (this.editingMessageShown = false), 3000);
      }
      return;
    }

    this.editingCell = { rowId: row.kpiId, key };
    const value = row[key];
    this.activeEditValue = value === null || value === undefined ? '' : String(value);
  }

  cancelEdit(): void {
    this.editingCell = { rowId: null, key: null };
    this.activeEditValue = '';
  }

  saveEdit(row: KpiRow, key: MetricKey): void {
    if (!this.canEditMetrics()) {
      this.toastr.error('You do not have permission to update this KPI value.', 'Permission Denied');
      return;
    }

    const site = this.resolveAreaCode(this.formValues.dropdown4);
    const parsed = this.activeEditValue === '' ? null : Number(this.activeEditValue);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0)) {
      this.toastr.error('Please enter a valid non-negative whole number.', 'Invalid Value');
      return;
    }

    const payload: UpsertOtherMetricRequest = {
      otherKpiId: row.kpiId,
      site,
      totalFaults: row.totalFaults ?? null,
      faultsWithinSla: row.faultsWithinSla ?? null,
      repeatedFaults: row.repeatedFaults ?? null,
      totalCustomers: row.totalCustomers ?? null,
      totalClearanceFaults: row.totalClearanceFaults ?? null,
      clearedWithin4Hrs: row.clearedWithin4Hrs ?? null,
      month: Number(this.selectedMonth),
      year: Number(this.selectedYear)
    };
    payload[key] = parsed;

    this.metricsLoading = true;
    this.otherKpiService.upsertMetric(payload).subscribe({
      next: () => {
        this.metricsLoading = false;
        this.cancelEdit();
        this.toastr.success('Metric saved successfully.', 'Success');
        this.loadMetrics();
      },
      error: (err) => {
        console.error('Failed to save Other KPI metric:', err);
        this.metricsLoading = false;
        this.toastr.error('Saving metric failed. Please try again.', 'Save Failed');
        this.cdr.detectChanges();
      }
    });
  }

  isEditingCell(row: KpiRow, key: MetricKey): boolean {
    return this.editingCell.rowId === row.kpiId && this.editingCell.key === key;
  }

  canEditMetrics(): boolean {
    return this.isEditingAllowed && !!this.resolveAreaCode(this.formValues.dropdown4);
  }

  formatMetric(value: number | null | undefined): string {
    return value === null || value === undefined ? '-' : String(value);
  }

  generateExcelReport(): void {
    const rows = this.data.map(row => ({
      No: row.no,
      'Network Engineer KPI': row.networkEngineerKpi,
      Division: row.division,
      Section: row.section,
      'KPI %': row.kpiPercent,
      Site: this.resolveAreaCode(this.formValues.dropdown4) || row.site || '',
      'Total Faults': row.totalFaults,
      'Faults Within SLA': row.faultsWithinSla,
      'Repeated Faults': row.repeatedFaults,
      'Total Customers': row.totalCustomers,
      'Total Clearance Faults': row.totalClearanceFaults,
      'Cleared Within 4 Hrs': row.clearedWithin4Hrs
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Other KPI');
    XLSX.writeFile(workbook, `Other_KPI_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private rebuildRows(): void {
    const metricsByKpiId = new Map<number, OtherMetricDto>();
    this.metricsRows.forEach(metric => {
      const key = Number(metric.otherKpiId ?? metric.id);
      if (!Number.isNaN(key)) metricsByKpiId.set(key, metric);
    });

    this.data = this.adminKpiRows.map(row => {
      const metric = metricsByKpiId.get(row.kpiId);
      return {
        ...row,
        metricId: metric?.id,
        site: metric?.site ?? this.resolveAreaCode(this.formValues.dropdown4),
        totalFaults: metric?.totalFaults ?? null,
        faultsWithinSla: metric?.faultsWithinSla ?? null,
        repeatedFaults: metric?.repeatedFaults ?? null,
        totalCustomers: metric?.totalCustomers ?? null,
        totalClearanceFaults: metric?.totalClearanceFaults ?? null,
        clearedWithin4Hrs: metric?.clearedWithin4Hrs ?? null
      };
    });
  }

  private recomputeEditPermission(): void {
    this.isEditingAllowed = this.authService.canEditPage(this.pageAccessName);
  }

  private generateYearOptions(span: number = 10): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: span }, (_, index) => currentYear - (span - 1) + index);
  }

  private normalizeAreaValue(value?: string | null): string {
    return value ? value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : '';
  }

  private resolveAreaCode(value?: string | null): string {
    const normalized = this.normalizeAreaValue(value);
    if (!normalized) return '';
    const directMatch = Object.keys(this.optionMapping).find(key => this.normalizeAreaValue(key) === normalized);
    if (directMatch) return directMatch;
    const labelMatch = Object.entries(this.optionMapping).find(([, label]) => this.normalizeAreaValue(label) === normalized);
    return labelMatch ? labelMatch[0] : normalized;
  }
}

@Component({
  selector: 'app-other-kpi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './other-kpi.component.html',
  styleUrls: ['./other-kpi.component.scss']
})
export class OtherKpiComponent extends BaseOtherKpiMetricsComponent {
  constructor(
    toastr: ToastrService,
    otherKpiService: OtherKpiPlatformService,
    regionService: RegionService,
    authService: AuthService,
    cdr: ChangeDetectorRef
  ) {
    super('Other KPI', 'OTHER KPI', toastr, otherKpiService, regionService, authService, cdr);
  }
}
