import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as ExcelJS from 'exceljs';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { TmActivityService } from '../../../../services/tm-activity.service';

type ProcessedDetail = {
  Column1: string;
  Column2: number | string;
  Column3: number | string;
  Column4?: number | string;
};

type ProcessedRecord = {
  month: string;
  details: ProcessedDetail[];
};

type HardcodedRecord = {
  _id?: string;
  no: number | string;
  kpi: string;
  target: string;
  calculation: string;
};

type TowerSums = Partial<Record<string, number>>;

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TABLE_TITLES = [
  '2. Proper maintaining and cleaning of tower sites, access roads, tower leg bases, and guy bases.',
  '3. Visual inspection of tower condition, aviation lighting system, etc.',
  '4. Measure earth readings and inspect Earthing system.'
];

@Component({
  selector: 'app-tm-activity-plan',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './tm-activity-plan.component.html',
  styleUrls: ['./tm-activity-plan.component.scss']
})
export class TmActivityPlanComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly tmActivityService = inject(TmActivityService);
  private readonly cdr = inject(ChangeDetectorRef);

  pageTitle = 'Tower Maintenance';
  headers: string[] = [];
  towerSums: TowerSums = {};
  calculatedValues: string[] = [];
  tableData: ProcessedRecord[] = [];
  hardcodedTableData: HardcodedRecord[] = [];
  loading = false;
  errorMessage = '';
  readonly tableTitles = TABLE_TITLES;

  /* ===================== FILTER STATE ===================== */

  private readonly now = new Date();

  selectedMonth: number = this.now.getMonth() + 1;
  selectedYear: number  = this.now.getFullYear();

  readonly monthOptions: { value: number; label: string }[] = [
    { value:  1, label: 'January'   },
    { value:  2, label: 'February'  },
    { value:  3, label: 'March'     },
    { value:  4, label: 'April'     },
    { value:  5, label: 'May'       },
    { value:  6, label: 'June'      },
    { value:  7, label: 'July'      },
    { value:  8, label: 'August'    },
    { value:  9, label: 'September' },
    { value: 10, label: 'October'   },
    { value: 11, label: 'November'  },
    { value: 12, label: 'December'  }
  ];

  yearOptions: number[] = [
    this.now.getFullYear(),
    this.now.getFullYear() - 1,
    this.now.getFullYear() - 2
  ];

  /* ===================== FILTER HANDLERS ===================== */

  onMonthChange(month: number): void {
    this.selectedMonth = Number(month);
    // Month only affects Strategic KPI Overview — recalculate without re-fetching
    this.calculatedValues = this.calculateFirstTableValues(this.tableData, this.headers);
    this.cdr.detectChanges();
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.fetchData();
  }

  /* ------------------------------------------------- */

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.tmActivityService.getAll().pipe(
      catchError(err => {
        console.error('Failed to fetch TM Activity plans', err);
        this.setError('Unable to load Tower Maintenance KPI definitions.');
        return of([]);
      })
    ).subscribe(hardcoded => {
      this.hardcodedTableData = (hardcoded && hardcoded.length)
        ? hardcoded.map(activity => ({
            no: typeof activity.no === 'string' ? parseInt(activity.no) : activity.no,
            kpi: activity.kpi,
            target: activity.target,
            calculation: activity.calculation
          }))
        : [];

      this.http.get<any[]>(`${environment.apiUrl}/tower-mtc/fetchTower?year=${this.selectedYear}`)
        .pipe(
          catchError(err => {
            console.error('Tower API error:', err);
            this.setError('Failed to load tower data.');
            return of([]);
          }),
          finalize(() => {
            this.loading = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe(apiData => {
          this.tableData = (apiData && apiData.length) ? this.convertToProcessedFormat(apiData) : [];
          this.processDerivedData(this.tableData);
        });
    });
  }

  exportToExcel(): void {
    if (!this.headers.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tower Maintenance Plan');

    const baseColumns = ['No', 'KPI', 'Target', 'Calculation'];
    const totalColumnsFirstTable = baseColumns.length + this.headers.length;

    worksheet.mergeCells(1, 1, 1, totalColumnsFirstTable);
    worksheet.getCell(1, 1).value = 'Tower Maintenance Activity Plan';
    worksheet.getCell(1, 1).font = { bold: true, size: 14 };
    worksheet.getCell(1, 1).alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([...baseColumns, ...this.headers]);
    this.styleHeaderRow(headerRow);

    this.hardcodedTableData.forEach(record => {
      const row = worksheet.addRow([
        record.no ?? '-',
        record.kpi ?? '-',
        record.target ?? '-',
        record.calculation ?? '-',
        ...this.calculatedValues.map(v => `${v}%`)
      ]);
      this.addBorder(row);
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    this.tableTitles.forEach(title => {
      const totalColumns = 1 + this.headers.length * 2;
      const titleRow = worksheet.addRow([title]);
      worksheet.mergeCells(titleRow.number, 1, titleRow.number, totalColumns);
      titleRow.font = { bold: true, size: 12 };
      titleRow.alignment = { horizontal: 'center' };

      const dynamicHeaders = ['Month', ...this.headers.flatMap(h => [`${h} Distribution`, `${h} Achievement`])];
      const dynamicHeaderRow = worksheet.addRow(dynamicHeaders);
      this.styleHeaderRow(dynamicHeaderRow);

      const towersRow = worksheet.addRow([
        '# Towers',
        ...this.headers.flatMap(h => [this.towerSums[h] ?? 0, ''])
      ]);
      this.addBorder(towersRow);

      this.tableData.forEach(entry => {
        const row = worksheet.addRow([
          entry.month,
          ...this.headers.flatMap(header => [
            this.getDetailValue(entry, header, 'Column2'),
            this.getDetailValue(entry, header, 'Column3')
          ])
        ]);
        this.addBorder(row);
      });

      worksheet.addRow([]);
    });

    worksheet.columns.forEach(column => { column.width = 18; });

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Tower_Maintenance_Plan.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  getDetailValue(entry: ProcessedRecord, header: string, column: 'Column2' | 'Column3'): string {
    const detail = entry.details.find(item => item.Column1 === header);
    const raw = detail ? (detail[column] ?? '') : '';
    return raw === '' ? '-' : String(raw);
  }

  trackByHeader = (_: number, header: string) => header;
  trackByMonth = (_: number, record: ProcessedRecord) => record.month;

  private processDerivedData(data: ProcessedRecord[]): void {
    const sorted = this.sortByMonth(data);
    this.headers = this.buildHeaders(sorted);
    this.towerSums = this.calculateTowerSums(sorted);
    this.calculatedValues = this.calculateFirstTableValues(sorted, this.headers);
  }

  private sortByMonth(data: ProcessedRecord[]): ProcessedRecord[] {
    return [...data].sort(
      (a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
    );
  }

  private convertToProcessedFormat(apiData: any[]): ProcessedRecord[] {
    return (apiData || []).map(item => ({
      month: item.month,
      details: Object.keys(item.data || {}).map(key => ({
        Column1: key,
        Column2: item.data[key]?.column2 ?? '-',
        Column3: item.data[key]?.column3 ?? '-',
        Column4: item.data[key]?.column4 ?? ''
      }))
    }));
  }

  private buildHeaders(data: ProcessedRecord[]): string[] {
    const unique = new Set<string>();
    data.forEach(entry => entry.details.forEach(detail => {
      if (detail.Column1) unique.add(detail.Column1);
    }));
    return Array.from(unique);
  }

  private calculateTowerSums(data: ProcessedRecord[]): TowerSums {
    const sums: TowerSums = {};
    data.slice(0, 3).forEach(entry => {
      entry.details.forEach(detail => {
        const current = sums[detail.Column1] ?? 0;
        sums[detail.Column1] = Number((current + (Number(detail.Column2) || 0)).toFixed(2));
      });
    });
    return sums;
  }

  // Strategic KPI Overview: use cumulative values (Column2 = CumulativeSched, Column3 = CumulativeAchieved)
  // from the entry matching the selected month
  private calculateFirstTableValues(data: ProcessedRecord[], headers: string[]): string[] {
    if (!headers.length || !data.length) return [];

    const selectedMonthName = MONTH_ORDER[this.selectedMonth - 1];
    const entry = data.find(d => d.month === selectedMonthName);
    if (!entry) return headers.map(() => '0.00');

    return headers.map(header => {
      const detail = entry.details.find(item => item.Column1 === header);
      if (!detail) return '0.00';
      const cumSched = Number(detail.Column2) || 0;
      const cumAchieved = Number(detail.Column3) || 0;
      return cumSched ? ((cumAchieved / cumSched) * 100).toFixed(2) : '0.00';
    });
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      this.addBorderToCell(cell);
    });
  }

  private addBorder(row: ExcelJS.Row): void {
    row.eachCell(cell => this.addBorderToCell(cell));
  }

  private addBorderToCell(cell: ExcelJS.Cell): void {
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  }

  private setError(message: string): void {
    if (!this.errorMessage) this.errorMessage = message;
  }
}
