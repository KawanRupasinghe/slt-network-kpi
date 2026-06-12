import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegionService, Region } from '../../../../services/region.service';
import { AuthService } from '../../../../services/auth.service';
import { AgedNetworkFailureService } from '../../../../services/aged-network-failure.service';

const DEFAULT_YEARS = (() => {
  const now = new Date();
  return [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];
})();

@Component({
  selector: 'app-node-failures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './node-failures.component.html',
  styleUrls: ['./node-failures.component.scss'],
})
export class NodeFailuresComponent implements OnInit, OnDestroy {
  pageTitle = 'Node Failures';

  loading = false;
  error: string | null = null;

  selectedMonth: number = new Date().getMonth() + 1;
  selectedYear: number = new Date().getFullYear();
  yearOptions: number[] = DEFAULT_YEARS;

  // Filter state
  formValues = {
    region: '', // R-GM (project uses region names)
  };

  regionOptions: string[] = [];

  tableRows: Array<Record<string, any>> = [];

  isSaving = false;

  private permissionTimer: ReturnType<typeof setInterval> | null = null;

  monthOptions: Array<{ value: number; label: string }> = [
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
    { value: 12, label: 'December' },
  ];

  constructor(
    private regionService: RegionService,
    private authService: AuthService,
    // Keeping service injected for future use when table/API is known.
    private agedFailureService: AgedNetworkFailureService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRegions();
    this.refresh();

    // Periodically refresh edit permission if page later supports inline edits
    this.permissionTimer = setInterval(() => {
      // no-op for now
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.permissionTimer) {
      clearInterval(this.permissionTimer);
      this.permissionTimer = null;
    }
  }

  get isEditingAllowed(): boolean {
    return this.authService.canEditPage('NODE FAILURES');
  }

  get monthLabel(): string {
    const labels = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return labels[this.selectedMonth - 1] || 'Month';
  }

  onMonthYearChange(): void {
    this.refresh();
  }

  onPeriodChange(): void {
    this.refresh();
  }

  refresh(): void {
    // Placeholder: once table details are provided, call the proper service/API here
    this.loading = true;
    this.error = null;

    // simulate async load
    Promise.resolve()
      .then(() => {
        const region = this.formValues.region;
        this.tableRows = [
          {
            details: `Node Failures data placeholder • Month=${this.monthLabel}, Year=${this.selectedYear}, R-GM=${region || 'All'}`,
          },
        ];
      })
      .catch((e) => {
        this.tableRows = [];
        this.error = 'Failed to load Node Failures data.';
        // eslint-disable-next-line no-console
        console.error(e);
      })
      .finally(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  private loadRegions(): void {
    this.regionService.getAll().subscribe({
      next: (res: Region[] | any[]) => {
        const list = Array.isArray(res) ? res : [];
        const mapped = list
          .map((x: any) => x.region ?? x.Region ?? '')
          .filter(Boolean);
        this.regionOptions = Array.from(new Set(mapped));
        this.cdr.detectChanges();
      },
      error: (err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load region list:', err);
        this.regionOptions = [];
        this.cdr.detectChanges();
      },
    });
  }
}

