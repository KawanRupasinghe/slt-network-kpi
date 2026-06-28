import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AnalyticsResultApi, AnalyticsService } from '../../../services/analytics.service';
import { Region as RegionApi, RegionService } from '../../../services/region.service';

type Region = {
  id: number;
  region: string;
  province: string;
  networkEngineer: string;
  lea: string;
};

interface KpiMetric {
  achieved: number;
  maximumPoints: number;
  pointsAchieved: number;
}

interface KpiRow {
  id: number;
  number: number;
  perspectives: string;
  category: string;
  strategicObjectives: string;
  kpi: string;
  target: string;
  weightage: number;
  pointsApplicable: number;
  metrics: KpiMetric[];
}

type KpiDefinition = {
  id: number;
  perspectives: string;
  category?: string;
  strategicObjectives: string;
  keyPerformanceIndicators: string;
  unit: string;
  descriptionOfKPI: string;
  weightage: number;
  pointsApplicable: number;
  month?: number;
  year?: number;
};

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['../overall/current-month/current-month.component.scss'],
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  selectedYear: number;
  selectedStartMonth: number;
  selectedEndMonth: number;

  monthOptions: { value: number; label: string }[] = [];
  yearOptions: number[] = [];

  loading = false;
  error: string | null = null;
  noDefinitions = false;
  noOverallResults = false;
  hoveredRowIndex: number | null = null;

  kpiRows: KpiRow[] = [];
  regions: Region[] = [];
  regionGroups: {
    region: string;
    provinces: { province: string; engineers: Region[] }[];
    totalEngineers: number;
  }[] = [];
  engineersFlat: Region[] = [];

  weightageSum = 0;
  totalPointsApplicable = 0;
  totalPointsAchievedByRegion: number[] = [];
  totalMaximumPointsByRegion: number[] = [];
  totalPointsNormalized: number[] = [];

  private readonly apiBase = `${environment.apiUrl}/kpi-definitions`;

  @ViewChildren('leftRowRef', { read: ElementRef })
  private leftRowElements!: QueryList<ElementRef<HTMLTableRowElement>>;

  @ViewChildren('rightRowRef', { read: ElementRef })
  private rightRowElements!: QueryList<ElementRef<HTMLTableRowElement>>;

  private readonly rowChangesSub = new Subscription();
  private pendingFrame: number | null = null;

  constructor(
    private http: HttpClient,
    private regionService: RegionService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedStartMonth = 1;
    this.selectedEndMonth = now.getMonth() + 1;

    this.monthOptions = [
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
    this.yearOptions = [this.selectedYear, this.selectedYear - 1, this.selectedYear - 2];
  }

  ngOnInit(): void {
    this.loadRegions();
  }

  ngAfterViewInit(): void {
    this.scheduleRowSync();

    this.rowChangesSub.add(
      this.leftRowElements.changes.subscribe(() => this.scheduleRowSync())
    );

    this.rowChangesSub.add(
      this.rightRowElements.changes.subscribe(() => this.scheduleRowSync())
    );
  }

  ngOnDestroy(): void {
    this.rowChangesSub.unsubscribe();
    if (this.pendingFrame !== null) cancelAnimationFrame(this.pendingFrame);
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadRegions();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleRowSync();
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
  }

  onStartMonthChange(month: number): void {
    this.selectedStartMonth = Number(month);
  }

  onEndMonthChange(month: number): void {
    this.selectedEndMonth = Number(month);
  }

  calculate(): void {
    this.fetchAnalyticsResults();
  }

  private fetchAnalyticsResults(): void {
    this.loading = true;
    this.error = null;
    this.noOverallResults = false;

    this.analyticsService.getCumulativeAnalytics(this.selectedYear, this.selectedStartMonth, this.selectedEndMonth)
      .subscribe({
        next: (results) => {
          // Reset existing metrics to 0 first
          this.kpiRows.forEach(row => {
            row.metrics.forEach(m => {
              m.achieved = 0;
              m.maximumPoints = 0;
              m.pointsAchieved = 0;
            });
          });

          if (!results || results.length === 0) {
            this.noOverallResults = true;
          } else {
            // We need a quick way to find the engineer index by area code (lea)
            const leaToIndex = new Map<string, number>();
            this.engineersFlat.forEach((eng, idx) => {
               leaToIndex.set(eng.lea, idx);
            });

            results.forEach(apiResult => {
               const row = this.kpiRows.find(r => r.id === apiResult.kpiDefinitionId);
               if (row) {
                  const idx = leaToIndex.get(apiResult.areaCode);
                  if (idx !== undefined) {
                     row.metrics[idx].achieved = apiResult.achievedKpi;
                     row.metrics[idx].maximumPoints = apiResult.maximumPointsPerKpi;
                     row.metrics[idx].pointsAchieved = apiResult.pointsAchieved;
                     // OverallKpiValuePercent remains as returned by the backend (currently 0)
                  }
               }
            });
          }

          this.computeTotals();
          this.scheduleRowSync();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed loading analytics results:', err);
          this.error = 'Unable to load analytics results from backend.';
          this.noOverallResults = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadRegions(): void {
    this.loading = true;
    this.error = null;

    this.regionService.getAll().subscribe({
      next: (res) => {
        this.regions = (res ?? []).map((r: RegionApi) => {
          const networkEngineer =
            (r as any).networkEngineer ??
            (r as any).networkengineer ??
            (r as any)['network_engineer'] ??
            '';
          const lea =
            (r as any).lea ??
            (r as any).leaCode ??
            (r as any).leacode ??
            (r as any)['lea_code'] ??
            '';

          return {
            id: r.id,
            region: r.region,
            province: r.province,
            networkEngineer: networkEngineer || '—',
            lea: lea || '—',
          };
        });

        this.buildRegionGrouping();
        this.loadKpiDefinitions();
      },
      error: (err) => {
        console.error('Failed loading regions:', err);
        this.error = 'Unable to load regions from backend.';
        this.regions = [];
        this.regionGroups = [];
        this.engineersFlat = [];
        this.loading = false;
        this.kpiRows = [];
        this.computeTotals();
        this.scheduleRowSync();
      },
    });
  }

  private buildRegionGrouping(): void {
    const regionMap = new Map<string, Map<string, Region[]>>();

    this.regions.forEach((item) => {
      const provinceMap =
        regionMap.get(item.region) ?? new Map<string, Region[]>();
      const engineers = provinceMap.get(item.province) ?? [];
      engineers.push(item);
      provinceMap.set(item.province, engineers);
      regionMap.set(item.region, provinceMap);
    });

    this.regionGroups = Array.from(regionMap.entries()).map(
      ([region, provinceMap]) => {
        const provinces = Array.from(provinceMap.entries()).map(
          ([province, engineers]) => ({
            province,
            engineers,
          })
        );

        const totalEngineers = provinces.reduce(
          (sum, p) => sum + p.engineers.length,
          0
        );

        return { region, provinces, totalEngineers };
      }
    );

    this.engineersFlat = this.regionGroups.flatMap((g) =>
      g.provinces.flatMap((p) => p.engineers)
    );
  }

  private loadKpiDefinitions(): void {
    this.loading = true;
    this.error = null;
    this.noDefinitions = false;
    this.noOverallResults = false;

    // Use selectedEndMonth to fetch definitions, acting as the 'month' for now.
    const month = this.selectedEndMonth;
    const year = this.selectedYear;
    const url = `${this.apiBase}?month=${month}&year=${year}`;

    this.http.get<KpiDefinition[]>(url).subscribe({
      next: (res) => {
        const list = (res ?? []).sort((a, b) => a.id - b.id);

        this.noDefinitions = list.length === 0;
        if (this.noDefinitions) {
          this.kpiRows = [];
          this.computeTotals();
          this.scheduleRowSync();
          this.noOverallResults = true;
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.kpiRows = list.map((row, rowIndex) => {
          const metrics: KpiMetric[] = this.engineersFlat.map(() => {
            return { achieved: 0, maximumPoints: 0, pointsAchieved: 0 };
          });

          return {
            id: row.id,
            number: rowIndex + 1,
            perspectives: row.perspectives,
            category: row.category ?? '',
            strategicObjectives: (row.strategicObjectives ?? '').replace(
              /service assurance/gi,
              'SA'
            ),
            kpi: row.keyPerformanceIndicators,
            target: row.descriptionOfKPI,
            weightage: row.weightage,
            pointsApplicable: row.pointsApplicable ?? 0,
            metrics,
          };
        });

        this.computeTotals();
        this.scheduleRowSync();

        this.noOverallResults = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed loading final table KPI rows:', err);
        this.error = 'Unable to load KPI rows from backend.';
        this.noDefinitions = true;
        this.noOverallResults = true;
        this.kpiRows = [];
        this.computeTotals();
        this.scheduleRowSync();
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private computeTotals(): void {
    this.weightageSum = this.kpiRows.reduce(
      (sum, row) => sum + (row.weightage ?? 0),
      0
    );

    this.totalPointsApplicable = this.kpiRows.reduce(
      (sum, row) => sum + (row.pointsApplicable ?? 0),
      0
    );

    this.totalMaximumPointsByRegion = this.engineersFlat.map((_, colIndex) =>
      this.kpiRows.reduce(
        (sum, row) => sum + (row.metrics[colIndex]?.maximumPoints ?? 0),
        0
      )
    );

    this.totalPointsAchievedByRegion = this.engineersFlat.map((_, colIndex) =>
      this.kpiRows.reduce(
        (sum, row) => sum + (row.metrics[colIndex]?.pointsAchieved ?? 0),
        0
      )
    );

    this.totalPointsNormalized = this.totalPointsAchievedByRegion.map((total, colIndex) =>
      this.totalMaximumPointsByRegion[colIndex]
        ? +((total / this.totalMaximumPointsByRegion[colIndex]) * 100).toFixed(2)
        : 0
    );
  }

  private scheduleRowSync(): void {
    if (!this.leftRowElements || !this.rightRowElements) return;

    if (this.pendingFrame !== null) cancelAnimationFrame(this.pendingFrame);

    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.syncRowHeights();
    });
  }

  private syncRowHeights(): void {
    const leftRows = this.leftRowElements.toArray().map((ref) => ref.nativeElement);
    const rightRows = this.rightRowElements.toArray().map((ref) => ref.nativeElement);

    if (!leftRows.length || !rightRows.length) return;

    leftRows.forEach((row) => row.style.removeProperty('height'));
    rightRows.forEach((row) => row.style.removeProperty('height'));

    const pairCount = Math.min(leftRows.length, rightRows.length);

    for (let i = 0; i < pairCount; i++) {
      const leftHeight = leftRows[i].getBoundingClientRect().height;
      const rightHeight = rightRows[i].getBoundingClientRect().height;
      const maxHeight = Math.max(leftHeight, rightHeight);

      leftRows[i].style.height = `${maxHeight}px`;
      rightRows[i].style.height = `${maxHeight}px`;
    }
  }

  setHoveredRowIndex(index: number | null): void {
    this.hoveredRowIndex = index;
    this.cdr.detectChanges();
  }

  calculate(): void {
    console.log('Calculate button clicked - analytics scaffold');
  }

  exportToExcel(): void {
    console.log('Export button clicked - analytics scaffold');
  }

  getComputedWeightage(row: KpiRow): string {
    if (this.totalPointsApplicable <= 0) return '0.00%';
    const weightage = (Number(row.pointsApplicable ?? 0) / this.totalPointsApplicable) * 100;
    return `${weightage.toFixed(2)}%`;
  }

  getTotalKpiPercentage(row: KpiRow): number {
    if (!row.metrics || row.metrics.length === 0 || !row.pointsApplicable) return 0;
    const totalPoints = row.metrics.reduce((sum, m) => sum + (m.pointsAchieved ?? 0), 0);
    const cappedPoints = Math.min(totalPoints, row.pointsApplicable);
    return (cappedPoints / row.pointsApplicable) * 100;
  }

  getKpiRowClass(row: KpiRow): string {
    const cat = (row.category ?? '').toLowerCase();
    if (cat.includes('enterprise') || cat.includes('enteprise')) {
      return 'category-enterprise';
    } else if (cat.includes('other operator') || cat.includes('operator')) {
      return 'category-other-operator';
    } else if (cat.includes('assurance')) {
      return 'category-assurance';
    } else if (cat.includes('fulfillment') || cat.includes('fullfillment')) {
      return 'category-fulfillment';
    }
    return '';
  }

  getAchievedCellClass(metric: KpiMetric): string {
    if (!metric || !metric.maximumPoints || metric.maximumPoints <= 0) return '';
    return metric.pointsAchieved >= metric.maximumPoints ? 'target-achieved' : 'target-failed';
  }

  formatHeaderLabel(value: string | null | undefined): string {
    if (!value) return '';
    const withSpaces = value.replace(/([a-zA-Z])([0-9])/g, '$1 $2');
    return withSpaces
      .split(/\s+/)
      .map((part) => {
        const isAllCaps = part === part.toUpperCase();
        if (isAllCaps && part.length <= 4) {
          return part;
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  }
}
