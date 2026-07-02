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
import { environment } from '../../../../../environments/environment';
import { Region as RegionApi, RegionService } from '../../../../services/region.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as XLSX from 'xlsx';

type Region = {
  id: number;
  region: string;
  province: string;
  networkEngineer: string;
  lea: string;
};
//kpi rows from backend with metrics initialized to 0 (until we fetch results)
interface KpiMetric {
  achieved: number; // %
  maximumPoints: number; // Points Per KPI
  pointsAchieved: number; // Points achieved (achieved % * max points / 100)
}

interface KpiRow {
  id: number;
  number: number;
  perspectives: string;
  category: string;
  strategicObjectives: string;
  kpi: string;

  // ✅ LEFT TABLE new structure
  target: string; // target = descriptionOfKPI (same)
  weightage: number;
  pointsApplicable: number;

  metrics: KpiMetric[];
}

/** final table API response */
type KpiDefinition = {
  id: number;
  perspectives: string;
  category?: string;
  strategicObjectives: string;
  keyPerformanceIndicators: string;

  // backend still returns these
  unit: string;
  descriptionOfKPI: string;
  weightage: number;

  // ✅ NEW FIELD from backend
  pointsApplicable: number;

  month?: number;
  year?: number;
};

type OverallKpiResultApi = {
  id: number;
  kpiDefinitionId: number;
  areaCode: string;
  achievedKpi: number;
  maximumPointsPerKpi: number;
  pointsAchieved: number;
  overallKpiValuePercent: number;
  month: number;
  year: number;
};

@Component({
  selector: 'app-current-month',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './current-month.component.html',
  styleUrls: ['./current-month.component.scss'],
})
export class CurrentMonthComponent implements OnInit, AfterViewInit, OnDestroy {
  currentMonth: string;
  currentYear: number;
  hoveredRowIndex: number | null = null;

  setHoveredRowIndex(index: number | null): void {
    this.hoveredRowIndex = index;
    this.cdr.detectChanges();
  }

  selectedMonth: number;
  selectedYear: number;
  monthOptions: { value: number; label: string }[] = [];
  yearOptions: number[] = [];

  loading = false;
  error: string | null = null;
  noDefinitions = false;
  noOverallResults = false;

  // properties for rendering Excel sheet directly
  isExcelView = false;
  excelHtmlContent: SafeHtml | string = '';

  /** same API you used in FinalTableComponent */
  private readonly apiBase = `${environment.apiUrl}/kpi-definitions`;


  private readonly overallResultsApiBase = `${environment.apiUrl}/overall-kpi-results`;


  @ViewChildren('leftRowRef', { read: ElementRef })
  private leftRowElements!: QueryList<ElementRef<HTMLTableRowElement>>;

  @ViewChildren('rightRowRef', { read: ElementRef })
  private rightRowElements!: QueryList<ElementRef<HTMLTableRowElement>>;

  regions: Region[] = [];
  regionGroups: {
    region: string;
    provinces: { province: string; engineers: Region[] }[];
    totalEngineers: number;
  }[] = [];
  engineersFlat: Region[] = [];

  // Current month data
  kpiRows: KpiRow[] = [];
  weightageSum = 0;
  totalPointsApplicable = 0;
  totalPointsAchievedByRegion: number[] = [];
  totalPointsNormalized: number[] = [];
  totalMaximumPointsByRegion: number[] = [];

  private readonly rowChangesSub = new Subscription();
  private pendingFrame: number | null = null;

  constructor(
    private http: HttpClient,
    private regionService: RegionService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });

    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();

    // Generate month options
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

    // Generate year options (current year first)
    this.yearOptions = [this.currentYear, this.currentYear - 1, this.currentYear - 2];

    this.syncDisplayedPeriod();
  }

  ngOnInit(): void {
    this.loadRegions();
  }

  onMonthChange(month: number): void {
    this.selectedMonth = Number(month);
    this.syncDisplayedPeriod();
    this.loadLeftTableFromApi();
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.syncDisplayedPeriod();
    this.loadLeftTableFromApi();
  }

  private getMonthLabel(month: number): string {
    return this.monthOptions.find((m) => m.value === month)?.label ?? '';
  }

  private syncDisplayedPeriod(): void {
    this.currentMonth = this.getMonthLabel(this.selectedMonth);
    this.currentYear = this.selectedYear;
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

  @HostListener('window:focus')
  onWindowFocus(): void {
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

  /** Manually trigger calculation/refresh of KPI results */
  calculate(): void {
    this.recalculateOverallResults();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleRowSync();
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
        this.loadLeftTableFromApi();
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

  /** ✅ Fetch KPI definitions from backend (LEFT table data) */
  private loadLeftTableFromApi(): void {
    this.loading = true;
    this.error = null;
    this.noDefinitions = false;
    this.noOverallResults = false;

    const month = this.selectedMonth;
    const year = this.selectedYear;
    const url = `${this.apiBase}?month=${month}&year=${year}`;

    this.http
      .get<KpiDefinition[]>(url)
      .subscribe({
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
            const metrics: KpiMetric[] = this.engineersFlat.map(
              () => {
                return { achieved: 0, maximumPoints: 0, pointsAchieved: 0 };
              }
            );

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

              // ✅ Target = DescriptionOfKPI (same)
              target: row.descriptionOfKPI,

              weightage: row.weightage,

              // ✅ new field from backend
              pointsApplicable: row.pointsApplicable ?? 0,

              metrics,
            };
          });

          this.computeTotals();
          this.scheduleRowSync();
          console.log('KPI definitions');
          this.kpiRows.forEach(x => console.log(x.id, x.kpi));
          this.loadOverallResultsFromApi();
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

  private loadOverallResultsFromExcel(month: number, year: number): void {
    this.noOverallResults = false;
    this.isExcelView = true;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const url = `assets/kpi-sheets/overall_kpi_2026_${monthStr}.xlsx`;

    this.http.get(url, { responseType: 'arraybuffer' }).subscribe({
      next: async (data: ArrayBuffer) => {
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);
          const worksheet = workbook.getWorksheet('Current Month KPI') || workbook.worksheets[0];

          if (!worksheet) {
            console.error('Worksheet not found in Excel file');
            this.noOverallResults = true;
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          // Parse merges
          const merges = worksheet.model.merges || [];
          const mergeMap = new Map<string, { rowspan: number; colspan: number }>();
          const hiddenCells = new Set<string>();

          const parseColRef = (colStr: string): number => {
            let col = 0;
            for (let i = 0; i < colStr.length; i++) {
              col = col * 26 + (colStr.charCodeAt(i) - 64);
            }
            return col;
          };

          const parseCellRef = (ref: string): { row: number; col: number } => {
            const match = /^([A-Z]+)([0-9]+)$/.exec(ref);
            if (!match) return { row: 0, col: 0 };
            return {
              row: parseInt(match[2], 10),
              col: parseColRef(match[1])
            };
          };

          merges.forEach(rangeStr => {
            const parts = rangeStr.split(':');
            if (parts.length === 2) {
              const start = parseCellRef(parts[0]);
              const end = parseCellRef(parts[1]);

              const rowspan = end.row - start.row + 1;
              const colspan = end.col - start.col + 1;

              mergeMap.set(`${start.row}:${start.col}`, { rowspan, colspan });

              for (let r = start.row; r <= end.row; r++) {
                for (let c = start.col; c <= end.col; c++) {
                  if (r !== start.row || c !== start.col) {
                    hiddenCells.add(`${r}:${c}`);
                  }
                }
              }
            }
          });

          // Helper to apply Excel tint to a hex color
          const applyTint = (hex: string, tint: number | undefined | null): string => {
            if (tint === undefined || tint === null || tint === 0) return hex;

            let r = parseInt(hex.substring(1, 3), 16);
            let g = parseInt(hex.substring(3, 5), 16);
            let b = parseInt(hex.substring(5, 7), 16);

            if (tint < 0) {
              r = Math.round(r * (1 + tint));
              g = Math.round(g * (1 + tint));
              b = Math.round(b * (1 + tint));
            } else {
              r = Math.round(r * (1 - tint) + 255 * tint);
              g = Math.round(g * (1 - tint) + 255 * tint);
              b = Math.round(b * (1 - tint) + 255 * tint);
            }

            const rs = Math.min(255, Math.max(0, r)).toString(16).padStart(2, '0');
            const gs = Math.min(255, Math.max(0, g)).toString(16).padStart(2, '0');
            const bs = Math.min(255, Math.max(0, b)).toString(16).padStart(2, '0');

            return `#${rs}${gs}${bs}`;
          };

          // Helper to extract hex color from ARGB, Theme, or Index
          const parseExcelColor = (color: any): string | null => {
            if (!color) return null;
            let hex: string | null = null;

            if (color.argb) {
              const argb = String(color.argb);
              hex = argb.length === 8 ? `#${argb.substring(2)}` : `#${argb}`;
            } else if (color.theme !== undefined) {
              const themeColors = [
                '#FFFFFF', // 0: White
                '#000000', // 1: Black
                '#E7E6E6', // 2: Light Gray
                '#44546A', // 3: Dark Blue/Gray
                '#5B9BD5', // 4: Blue
                '#ED7D31', // 5: Orange
                '#A5A5A5', // 6: Gray
                '#FFC000', // 7: Gold
                '#4472C4', // 8: Accent Blue
                '#70AD47'  // 9: Accent Green
              ];
              hex = themeColors[color.theme] || null;
            } else if (color.indexed !== undefined) {
              const indexedColors: { [key: number]: string } = {
                8: '#000000', 9: '#FFFFFF', 10: '#FF0000', 11: '#00FF00', 12: '#0000FF',
                13: '#FFFF00', 14: '#FF00FF', 15: '#00FFFF', 16: '#800000', 17: '#008000',
                18: '#000080', 19: '#808000', 20: '#800080', 21: '#008080', 22: '#C0C0C0',
                23: '#808080', 64: '#FFFFFF'
              };
              hex = indexedColors[color.indexed] || null;
            }

            if (hex) {
              return applyTint(hex, color.tint);
            }
            return null;
          };

          // Generate HTML table with inline styles
          let html = '<table style="border-collapse: collapse; width: max-content; min-width: 100%; font-family: Segoe UI, sans-serif; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">';

          worksheet.eachRow({ includeEmpty: true }, (row, rowIdx) => {
            html += '<tr>';

            for (let colIdx = 1; colIdx <= worksheet.columnCount; colIdx++) {
              const cellKey = `${rowIdx}:${colIdx}`;
              if (hiddenCells.has(cellKey)) {
                continue;
              }

              const cell = row.getCell(colIdx);
              const mergeInfo = mergeMap.get(cellKey);
              const rowspanAttr = mergeInfo ? ` rowspan="${mergeInfo.rowspan}"` : '';
              const colspanAttr = mergeInfo ? ` colspan="${mergeInfo.colspan}"` : '';

              const colWidth = worksheet.getColumn(colIdx).width || 12;
              const widthPx = Math.round(colWidth * 9);
              let styles = `border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 13px; line-height: 1.3; vertical-align: middle; white-space: normal; word-break: break-word; min-width: ${widthPx}px; width: ${widthPx}px;`;

              // Background Fill
              if (cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor) {
                const color = parseExcelColor(cell.fill.fgColor);
                if (color) {
                  styles += ` background-color: ${color} !important;`;
                }
              }

              // Font styles
              if (cell.font) {
                if (cell.font.bold) styles += ' font-weight: bold;';
                if (cell.font.italic) styles += ' font-style: italic;';
                if (cell.font.size) styles += ` font-size: ${cell.font.size}pt;`;
                if (cell.font.name) styles += ` font-family: ${cell.font.name}, sans-serif;`;
                const fontColor = parseExcelColor(cell.font.color);
                if (fontColor) {
                  styles += ` color: ${fontColor};`;
                }
              }

              // Alignment
              if (cell.alignment) {
                if (cell.alignment.horizontal) {
                  styles += ` text-align: ${cell.alignment.horizontal};`;
                }
                if (cell.alignment.vertical) {
                  styles += ` vertical-align: ${cell.alignment.vertical};`;
                }
              }

              // Format value
              let cellValue = '';
              if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === 'object') {
                  if ((cell.value as any).result !== undefined) {
                    cellValue = String((cell.value as any).result);
                  } else if ((cell.value as any).richText) {
                    cellValue = (cell.value as any).richText.map((rt: any) => rt.text).join('');
                  } else {
                    cellValue = String(cell.value);
                  }
                } else {
                  cellValue = String(cell.value);
                }
              }

              // Apply number formatting conversions
              if (typeof cell.value === 'number') {
                if (cell.numFmt && cell.numFmt.includes('%')) {
                  const val = Number(cell.value);
                  if (val > 1) {
                    cellValue = `${val.toFixed(2)}%`;
                  } else {
                    cellValue = `${(val * 100).toFixed(2)}%`;
                  }
                } else if (cell.numFmt && cell.numFmt.includes('0.0000')) {
                  cellValue = Number(cell.value).toFixed(4);
                } else if (cell.numFmt && cell.numFmt.includes('0.00')) {
                  cellValue = Number(cell.value).toFixed(2);
                }
              }

              cellValue = cellValue.replace(/\n/g, '<br>');

              html += `<td style="${styles}"${rowspanAttr}${colspanAttr}>${cellValue}</td>`;
            }

            html += '</tr>';
          });

          html += '</table>';
          this.excelHtmlContent = this.sanitizer.bypassSecurityTrustHtml(html);

          this.loading = false;
          this.cdr.detectChanges();
        } catch (e) {
          console.error('Error rendering excel', e);
          this.noOverallResults = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Failed loading excel file:', err);
        this.noOverallResults = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadOverallResultsFromApi(): void {
    this.noOverallResults = false;
    const month = this.selectedMonth;
    const year = this.selectedYear;

    if (year === 2026 && (month === 1 || month === 2 || month === 3)) {
      this.loadOverallResultsFromExcel(month, year);
      return;
    }

    this.isExcelView = false;
    this.excelHtmlContent = '';

    const url = `${this.overallResultsApiBase}?month=${month}&year=${year}`;

    this.http.get<OverallKpiResultApi[]>(url).subscribe({
      next: (rows) => {
        const raw = Array.isArray(rows) ? rows : [];

        // Normalize incoming JSON property casing (handle both camelCase and PascalCase)
        const list: OverallKpiResultApi[] = raw.map((r: any) => ({
          id: Number(r.id ?? r.Id ?? 0),
          kpiDefinitionId: Number(r.kpiDefinitionId ?? r.KpiDefinitionId ?? 0),
          areaCode: String(r.areaCode ?? r.AreaCode ?? ''),
          achievedKpi: Number(r.achievedKpi ?? r.AchievedKpi ?? 0),
          maximumPointsPerKpi: Number(r.maximumPointsPerKpi ?? r.MaximumPointsPerKpi ?? 0),
          pointsAchieved: Number(r.pointsAchieved ?? r.PointsAchieved ?? 0),
          overallKpiValuePercent: Number(r.overallKpiValuePercent ?? r.OverallKpiValuePercent ?? 0),
          month: Number(r.month ?? r.Month ?? 0),
          year: Number(r.year ?? r.Year ?? 0),
        }));

        this.noOverallResults = list.length === 0;
        console.log('Overall results');
        list.forEach(x => console.log(x.kpiDefinitionId, x.areaCode, x.achievedKpi));
        const grouped = new Map<number, OverallKpiResultApi[]>();

        list.forEach((row) => {
          const bucket = grouped.get(row.kpiDefinitionId) ?? [];
          bucket.push(row);
          grouped.set(row.kpiDefinitionId, bucket);
        });

        this.kpiRows = this.kpiRows.map((kpiRow) => {
          const byKpi = grouped.get(kpiRow.id) ?? [];
          console.log('Engineers');
          this.engineersFlat.forEach(x => console.log(x.networkEngineer, x.lea));
          const metrics = this.engineersFlat.map((engineer) => {
            const match = this.findOverallResultForArea(byKpi, engineer.lea);
            return {
              achieved: Number(match?.achievedKpi ?? 0),
              maximumPoints: Number(match?.maximumPointsPerKpi ?? 0),
              pointsAchieved: Number(match?.pointsAchieved ?? 0),
            };
          });

          return { ...kpiRow, metrics };
        });

        this.computeTotals();
        const percentByArea = new Map<string, number>();
        list.forEach((row) => {
          if (row.overallKpiValuePercent !== undefined && row.overallKpiValuePercent !== null) {
            percentByArea.set(this.normalizeArea(row.areaCode), Number(row.overallKpiValuePercent));
          }
        });
        if (percentByArea.size > 0) {
          this.totalPointsNormalized = this.engineersFlat.map((engineer, index) => {
            const value = percentByArea.get(this.normalizeArea(engineer.lea));
            return value !== undefined ? Number(value.toFixed(2)) : this.totalPointsNormalized[index] ?? 0;
          });
        }
        this.scheduleRowSync();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed loading overall KPI results:', err);
        this.noOverallResults = true;
        this.computeTotals();
        this.scheduleRowSync();
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private recalculateOverallResults(): void {
    this.loading = true;
    this.error = null;

    const month = this.selectedMonth;
    const year = this.selectedYear;
    const url = `${this.overallResultsApiBase}/calculate?month=${month}&year=${year}`;

    this.http.post<OverallKpiResultApi[]>(url, {}).subscribe({
      next: () => {
        this.loadRegions();
      },
      error: (err) => {
        console.error('Failed recalculating overall KPI results:', err);
        this.loading = false;
        this.error = 'Unable to recalculate overall KPI results.';
        this.cdr.detectChanges();
      },
    });
  }

  private findOverallResultForArea(rows: OverallKpiResultApi[], areaCode: string): OverallKpiResultApi | undefined {
    const normalizedTarget = this.normalizeArea(areaCode);
    const exact = rows.find((x) => this.normalizeArea(x.areaCode) === normalizedTarget);
    if (exact) return exact;

    const partial = rows.find((x) => {
      const n = this.normalizeArea(x.areaCode);
      return n.includes(normalizedTarget) || normalizedTarget.includes(n);
    });
    return partial;
  }

  private normalizeArea(value: string): string {
    return (value ?? '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
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

  /** Compute weightage dynamically based on total points (normalized to 100%) */
  getComputedWeightage(row: KpiRow): string {
    if (this.totalPointsApplicable <= 0) return '0.00%';
    const weightage = (Number(row.pointsApplicable ?? 0) / this.totalPointsApplicable) * 100;
    return `${weightage.toFixed(2)}%`;
  }

  /** Compute the total KPI percentage achieved by all engineers for a row, capped at 100% */
  getTotalKpiPercentage(row: KpiRow): number {
    if (!row.metrics || row.metrics.length === 0 || !row.pointsApplicable) return 0;
    const totalPoints = row.metrics.reduce((sum, m) => sum + (m.pointsAchieved ?? 0), 0);
    const cappedPoints = Math.min(totalPoints, row.pointsApplicable);
    return (cappedPoints / row.pointsApplicable) * 100;
  }

  async exportToExcel(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Current Month KPI');

    // Define colors matching your UI
    const headerBgColor = '0057A6'; // SLT Blue
    const headerTextColor = 'FFFFFF'; // White
    const altRowBgColor = 'E2EDFF'; // Light blue
    const totalRowBgColor = '02B28C'; // SLT Teal
    const borderColor = 'D1D5DB'; // Gray border

    // Starting column for left table
    let currentCol = 1;

    // ===== LEFT TABLE: KPI DEFINITIONS =====
    // Header row 1: R-GM
    const rgmCell = worksheet.getCell(1, currentCol);
    rgmCell.value = 'R-GM';
    rgmCell.font = { bold: true, color: { argb: headerTextColor }, size: 12 };
    rgmCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
    rgmCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(1, currentCol, 1, currentCol + 6);

    // Header row 2: P-DGM
    const pdgmCell = worksheet.getCell(2, currentCol);
    pdgmCell.value = 'P-DGM';
    pdgmCell.font = { bold: true, color: { argb: headerTextColor }, size: 12 };
    pdgmCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
    pdgmCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(2, currentCol, 2, currentCol + 6);

    // Header row 3: NW EE/RTOM AREA
    const nwCell = worksheet.getCell(3, currentCol);
    nwCell.value = 'NW EE/RTOM AREA';
    nwCell.font = { bold: true, color: { argb: headerTextColor }, size: 12 };
    nwCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
    nwCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(3, currentCol, 3, currentCol + 6);

    // Column headers row 4
    const leftHeaders = ['Perspectives', 'Category', 'Key Performance Indicators (KPI)', 'Target', 'Weightage', 'Points Applicable', 'Total KPI Percentage'];
    leftHeaders.forEach((header, idx) => {
      const cell = worksheet.getCell(4, currentCol + idx);
      cell.value = header;
      cell.font = { bold: true, color: { argb: headerTextColor }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'thin', color: { argb: borderColor } },
        left: { style: 'thin', color: { argb: borderColor } },
        right: { style: 'thin', color: { argb: borderColor } }
      };
    });

    // Set column widths for left table
    worksheet.getColumn(currentCol).width = 18;     // Perspectives
    worksheet.getColumn(currentCol + 1).width = 25; // Category
    worksheet.getColumn(currentCol + 2).width = 35; // KPI
    worksheet.getColumn(currentCol + 3).width = 20; // Target
    worksheet.getColumn(currentCol + 4).width = 12; // Weightage
    worksheet.getColumn(currentCol + 5).width = 15; // Points Applicable
    worksheet.getColumn(currentCol + 6).width = 20; // Total KPI Percentage

    // Data rows
    let currentRow = 5;
    this.kpiRows.forEach((row, idx) => {
      const isAltRow = idx % 2 === 1;
      const rowData = [
        row.perspectives,
        row.category,
        row.kpi,
        row.target,
        this.getComputedWeightage(row),
        row.pointsApplicable,
        Number(this.getTotalKpiPercentage(row).toFixed(2))
      ];

      rowData.forEach((value, colIdx) => {
        const cell = worksheet.getCell(currentRow, currentCol + colIdx);
        cell.value = value;
        if (colIdx === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.numFmt = '0.00"%"';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
        if (isAltRow) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRowBgColor } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } }
        };
        if (colIdx === 2) { // KPI column
          cell.font = { bold: true };
        }
      });
      currentRow++;
    });

    // Total Marks row
    const totalCell1 = worksheet.getCell(currentRow, currentCol);
    totalCell1.value = 'Total Marks';
    totalCell1.font = { bold: true, color: { argb: headerTextColor } };
    totalCell1.alignment = { horizontal: 'right', vertical: 'middle' };
    totalCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };
    worksheet.mergeCells(currentRow, currentCol, currentRow, currentCol + 4);

    const totalCell2 = worksheet.getCell(currentRow, currentCol + 5);
    totalCell2.value = this.totalPointsApplicable;
    totalCell2.font = { bold: true, color: { argb: headerTextColor } };
    totalCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

    const totalCell3 = worksheet.getCell(currentRow, currentCol + 6);
    totalCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };
    totalCell3.border = {
      top: { style: 'thin', color: { argb: borderColor } },
      bottom: { style: 'thin', color: { argb: borderColor } },
      left: { style: 'thin', color: { argb: borderColor } },
      right: { style: 'thin', color: { argb: borderColor } }
    };
    currentRow++;

    // KPI label row
    const kpiLabelCell = worksheet.getCell(currentRow, currentCol);
    kpiLabelCell.value = 'KPI';
    kpiLabelCell.font = { bold: true };
    kpiLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    kpiLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
    worksheet.mergeCells(currentRow, currentCol, currentRow, currentCol + 4);

    const kpiLabelCell2 = worksheet.getCell(currentRow, currentCol + 5);
    kpiLabelCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
    kpiLabelCell2.border = {
      top: { style: 'thin', color: { argb: borderColor } },
      bottom: { style: 'thin', color: { argb: borderColor } },
      left: { style: 'thin', color: { argb: borderColor } },
      right: { style: 'thin', color: { argb: borderColor } }
    };

    const kpiLabelCell3 = worksheet.getCell(currentRow, currentCol + 6);
    kpiLabelCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
    kpiLabelCell3.border = {
      top: { style: 'thin', color: { argb: borderColor } },
      bottom: { style: 'thin', color: { argb: borderColor } },
      left: { style: 'thin', color: { argb: borderColor } },
      right: { style: 'thin', color: { argb: borderColor } }
    };
    currentRow++;

    // ===== RIGHT TABLE: REGION PERFORMANCE =====
    currentCol = 8; // Start after left table columns
    currentRow = 1;

    // Region headers
    this.regionGroups.forEach(region => {
      const startCol = currentCol;
      const regionCell = worksheet.getCell(currentRow, startCol);
      regionCell.value = region.region;
      regionCell.font = { bold: true, color: { argb: headerTextColor }, size: 12 };
      regionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
      regionCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(currentRow, startCol, currentRow, startCol + (region.totalEngineers * 3) - 1);
      currentCol += region.totalEngineers * 3;
    });

    // Province headers
    currentCol = 8;
    currentRow = 2;
    this.regionGroups.forEach(region => {
      region.provinces.forEach(province => {
        const startCol = currentCol;
        const provCell = worksheet.getCell(currentRow, startCol);
        provCell.value = province.province;
        provCell.font = { bold: true, color: { argb: headerTextColor }, size: 11 };
        provCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
        provCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.mergeCells(currentRow, startCol, currentRow, startCol + (province.engineers.length * 3) - 1);
        currentCol += province.engineers.length * 3;
      });
    });

    // Network Engineer headers
    currentCol = 8;
    currentRow = 3;
    this.engineersFlat.forEach(eng => {
      const startCol = currentCol;
      const engCell = worksheet.getCell(currentRow, startCol);
      engCell.value = `${eng.networkEngineer}\n(${eng.lea})`;
      engCell.font = { bold: true, color: { argb: headerTextColor }, size: 10 };
      engCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
      engCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      worksheet.mergeCells(currentRow, startCol, currentRow, startCol + 2);
      currentCol += 3;
    });

    // Column sub-headers (Achieved KPI, Maximum Points, Points Achieved)
    currentCol = 8;
    currentRow = 4;
    this.engineersFlat.forEach(() => {
      const headers = ['Achieved KPI', 'Maximum Points Per KPI', 'Points Achieved'];
      headers.forEach(header => {
        const cell = worksheet.getCell(currentRow, currentCol);
        cell.value = header;
        cell.font = { bold: true, color: { argb: headerTextColor }, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } }
        };
        worksheet.getColumn(currentCol).width = 12;
        currentCol++;
      });
    });

    // Data rows for right table
    currentRow = 5;
    this.kpiRows.forEach((row, idx) => {
      const isAltRow = idx % 2 === 1;
      currentCol = 8;

      row.metrics.forEach(metric => {
        const achievedCell = worksheet.getCell(currentRow, currentCol);
        achievedCell.value = Number((metric.achieved).toFixed(2));
        achievedCell.numFmt = '0.00"%"';
        achievedCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isAltRow) achievedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRowBgColor } };
        achievedCell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } }
        };

        const maxPointsCell = worksheet.getCell(currentRow, currentCol + 1);
        maxPointsCell.value = Number(metric.maximumPoints.toFixed(4));
        maxPointsCell.numFmt = '0.0000';
        maxPointsCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isAltRow) maxPointsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRowBgColor } };
        maxPointsCell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } }
        };

        const pointsAchCell = worksheet.getCell(currentRow, currentCol + 2);
        pointsAchCell.value = Number(metric.pointsAchieved.toFixed(4));
        pointsAchCell.numFmt = '0.0000';
        pointsAchCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isAltRow) pointsAchCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRowBgColor } };
        pointsAchCell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } }
        };

        currentCol += 3;
      });
      currentRow++;
    });

    // Summary row (totals)
    currentCol = 8;
    this.totalPointsAchievedByRegion.forEach((total, idx) => {
      const emptyCell = worksheet.getCell(currentRow, currentCol);
      emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

      const maxCell = worksheet.getCell(currentRow, currentCol + 1);
      maxCell.value = Number(this.totalMaximumPointsByRegion[idx].toFixed(4));
      maxCell.numFmt = '0.0000';
      maxCell.font = { bold: true, color: { argb: headerTextColor } };
      maxCell.alignment = { horizontal: 'center', vertical: 'middle' };
      maxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

      const totalCell = worksheet.getCell(currentRow, currentCol + 2);
      totalCell.value = Number(total.toFixed(4));
      totalCell.numFmt = '0.0000';
      totalCell.font = { bold: true, color: { argb: headerTextColor } };
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

      currentCol += 3;
    });
    currentRow++;

    // Normalized percentage row
    currentCol = 8;
    this.totalPointsNormalized.forEach(norm => {
      const emptyCell1 = worksheet.getCell(currentRow, currentCol);
      emptyCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

      const emptyCell2 = worksheet.getCell(currentRow, currentCol + 1);
      emptyCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

      const normCell = worksheet.getCell(currentRow, currentCol + 2);
      normCell.value = Number(norm.toFixed(2));
      normCell.numFmt = '0.00"%"';
      normCell.font = { bold: true, color: { argb: headerTextColor } };
      normCell.alignment = { horizontal: 'center', vertical: 'middle' };
      normCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: totalRowBgColor } };

      currentCol += 3;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const selectedLabel = this.getMonthLabel(this.selectedMonth) || 'Month';
    saveAs(blob, `Current_Month_KPI_${selectedLabel}_${this.selectedYear}.xlsx`);
  }

  getAchievedCellClass(metric: KpiMetric): string {
    if (!metric || !metric.maximumPoints || metric.maximumPoints <= 0) return '';
    return metric.pointsAchieved >= metric.maximumPoints ? 'target-achieved' : 'target-failed';
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
}
