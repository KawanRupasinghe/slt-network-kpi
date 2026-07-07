import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RegionService } from '../../../services/region.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as ExcelJS from 'exceljs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-q1',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './2026-q1.component.html',
  styleUrls: ['./2026-q1.component.scss']
})
export class Q1Component implements OnInit {
  currentMonth: string;
  currentYear: number;
  
  selectedMonth: number;
  selectedYear: number;
  monthOptions: { value: number; label: string }[] = [];
  yearOptions: number[] = [];

  engineersCount = 0;
  loading = false;
  noOverallResults = false;

  isExcelView = false;
  excelHtmlContent: SafeHtml | string = '';

  private readonly apiBase = `${environment.apiUrl}/kpi-definitions`;

  constructor(
    private regionService: RegionService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    const now = new Date();
    this.currentYear = 2026; 
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    
    const currentMonthIndex = now.getMonth() + 1;
    this.selectedMonth = currentMonthIndex <= 3 ? currentMonthIndex : 1;
    this.selectedYear = 2026;

    this.monthOptions = [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' }
    ];

    this.yearOptions = [2026];

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

  private loadRegions(): void {
    this.loading = true;
    this.regionService.getAll().subscribe({
      next: (res) => {
        const regions = res || [];
        const regionMap = new Map<string, Map<string, any[]>>();

        regions.forEach((item: any) => {
          const provinceMap = regionMap.get(item.region) ?? new Map<string, any[]>();
          const engineers = provinceMap.get(item.province) ?? [];
          engineers.push(item);
          provinceMap.set(item.province, engineers);
          regionMap.set(item.region, provinceMap);
        });

        const regionGroups = Array.from(regionMap.entries()).map(([region, provinceMap]) => {
          const provinces = Array.from(provinceMap.entries()).map(([province, engineers]) => ({
            province,
            engineers,
          }));
          return { region, provinces };
        });

        const engineersFlat = regionGroups.flatMap((g) =>
          g.provinces.flatMap((p) => p.engineers)
        );

        this.engineersCount = engineersFlat.length;
        this.loadLeftTableFromApi();
      },
      error: (err) => {
        console.error('Failed loading regions:', err);
        this.engineersCount = 0;
        this.loading = false;
      },
    });
  }

  private loadLeftTableFromApi(): void {
    this.loading = true;
    const month = this.selectedMonth;
    const year = this.selectedYear;
    const url = `${this.apiBase}?month=${month}&year=${year}`;

    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        // Definitions loaded as required
        this.loadOverallResultsFromExcel(month, year);
      },
      error: (err) => {
        console.error('Failed loading KPI definitions:', err);
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

          const parseExcelColor = (color: any): string | null => {
            if (!color) return null;
            let hex: string | null = null;

            if (color.argb) {
              const argb = String(color.argb);
              hex = argb.length === 8 ? `#${argb.substring(2)}` : `#${argb}`;
            } else if (color.theme !== undefined) {
              const themeColors = [
                '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#5B9BD5', 
                '#ED7D31', '#A5A5A5', '#FFC000', '#4472C4', '#70AD47'
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

              if (cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor) {
                const color = parseExcelColor(cell.fill.fgColor);
                if (color) {
                  styles += ` background-color: ${color} !important;`;
                }
              }

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

              if (cell.alignment) {
                if (cell.alignment.horizontal) {
                  styles += ` text-align: ${cell.alignment.horizontal};`;
                }
                if (cell.alignment.vertical) {
                  styles += ` vertical-align: ${cell.alignment.vertical};`;
                }
              }

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
}
