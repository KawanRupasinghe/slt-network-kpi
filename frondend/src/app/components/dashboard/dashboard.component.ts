/*
 File: dashboard.component.ts
 Description: Main KPI dashboard display component
 Purpose: Display comprehensive KPI metrics with region data, overall performance indicators, and detailed meter information.
 Features: Region-based KPI display, meter details modal, animations, responsive layout, performance tracking
*/

import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';


interface MeterData {
  code: string;
  label: string;
  engineer?: string;
}

interface RegionData {
  title: string;
  meters: MeterData[];
}

interface TotalsData {
  [key: string]: number;
}

type RegionApi = {
  id: number;
  region: string;
  province: string;
  networkEngineer: string;
  leaCode: string;
};

type RtomAreaApi = {
  areaCode: string;
  displayName: string;
};

type OverallKpiResultApi = {
  areaCode: string;
  overallKpiValuePercent: number;
  kpiDefinitionId: number;
  kpiName?: string;
  achievedKpi: number;
  maximumPointsPerKpi: number;
  pointsAchieved: number;
};

type MeterKpiRow = {
  kpiDefinitionId: number;
  kpiName: string;
  achievedKpi: number;
  maximumPointsPerKpi: number;
  pointsAchieved: number;
  category?: string;
};

type MeterDetails = {
  region: string;
  province: string;
  networkEngineer: string;
  leaCode: string;
  displayName: string;
  overallPercent: number;
  totalMaximumPoints: number;
  totalPointsAchieved: number;
  kpiRows: MeterKpiRow[];
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('hoverScale', [
      state('normal', style({ transform: 'scale(1)', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' })),
      state('hover', style({ transform: 'scale(1.02)', boxShadow: '0 12px 30px rgba(0,0,0,0.15)' })),
      transition('normal <=> hover', animate('200ms ease-in-out'))
    ]),
    trigger('meterHover', [
      state('normal', style({ transform: 'scale(1)' })),
      state('hover', style({ transform: 'scale(1.1)' })),
      transition('normal <=> hover', animate('200ms ease-in-out'))
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly now = new Date();

  selectedMonth = this.now.getMonth() + 1;
  selectedYear = this.now.getFullYear();


  monthOptions: { value: number; label: string }[] = [
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
  yearOptions: number[] = [this.selectedYear, this.selectedYear - 1, this.selectedYear - 2];

  regions: RegionData[] = [];
  totals: TotalsData = {};
  loading = true;
  error: string | null = null;
  selectedDetails: MeterDetails | null = null;
  selectedRegionTitle = '';
  regionCount = 0;
  engineerCount = 0;
  provinceCount = 0;
  leaCount = 0;

  // Hover state management
  regionHoverStates: { [key: number]: boolean } = {};
  meterHoverStates: { [key: string]: boolean } = {};

 // private readonly regionApiBase = 'http://localhost:5043/api/regiondata';
 // private readonly rtomApiBase = 'http://localhost:5043/api/rtom-areas';
 // private readonly overallKpiApiBase = 'http://localhost:5043/api/overall-kpi-results';

  private readonly regionApiBase = `${environment.apiUrl}/regiondata`;
  private readonly rtomApiBase = `${environment.apiUrl}/rtom-areas`;
  private readonly overallKpiApiBase = `${environment.apiUrl}/overall-kpi-results`;

  private kpiCategoryMap = new Map<number, string>();
  private regionRows: RegionApi[] = [];
  private overallRows: OverallKpiResultApi[] = [];
  private engineerLookup = new Map<string, string>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  get currentMonthLabel(): string {
    const found = this.monthOptions.find((m) => m.value === this.selectedMonth);
    return found ? found.label : '';
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
  }

  onMonthChange(month: number): void {
    this.selectedMonth = Number(month);
    this.loadDashboardData();
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.loadDashboardData();
  }

  private sortRegionNames(a: string, b: string): number {
    if (a === 'Metro' && b !== 'Metro') return -1;
    if (b === 'Metro' && a !== 'Metro') return 1;

    const ra = a.match(/Region\s*(\d+)/i);
    const rb = b.match(/Region\s*(\d+)/i);
    if (ra && rb) return Number(ra[1]) - Number(rb[1]);

    return a.localeCompare(b);
  }

  private loadDashboardData(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    const month = this.selectedMonth;
    const year = this.selectedYear;

    forkJoin({
      regions: this.http.get<RegionApi[]>(this.regionApiBase),
      rtomAreas: this.http.get<RtomAreaApi[]>(this.rtomApiBase),
      overall: this.http.get<OverallKpiResultApi[]>(`${this.overallKpiApiBase}?month=${month}&year=${year}`),
      kpis: this.http.get<any[]>(`${environment.apiUrl}/kpi-definitions?month=${month}&year=${year}`)
    }).subscribe({
      next: ({ regions, rtomAreas, overall, kpis }) => {
        this.regionRows = regions ?? [];
        this.overallRows = overall ?? [];
        this.kpiCategoryMap.clear();
        (kpis ?? []).forEach((kpi) => {
          this.kpiCategoryMap.set(kpi.id, kpi.category ?? '');
        });
        const rtomLookup = new Map<string, string>();
        (rtomAreas ?? []).forEach((area) => {
          const code = this.normalizeArea((area as any).areaCode ?? (area as any).AreaCode ?? '');
          const name = (area as any).displayName ?? (area as any).DisplayName ?? '';
          if (code) rtomLookup.set(code, name || (area as any).areaCode || (area as any).AreaCode || '');
        });

        const engineerLookup = new Map<string, string>();
        (regions ?? []).forEach((row) => {
          const code = this.normalizeArea((row as any).leaCode ?? (row as any).LeaCode ?? '');
          const engineer = this.normalizeName((row as any).networkEngineer ?? (row as any).NetworkEngineer ?? '');
          if (code && engineer && !engineerLookup.has(code)) {
            engineerLookup.set(code, engineer);
          }
        });
        this.engineerLookup = engineerLookup;

        const percentLookup = new Map<string, number>();
        (overall ?? []).forEach((row) => {
          const code = this.normalizeArea((row as any).areaCode ?? (row as any).AreaCode ?? '');
          if (!code || percentLookup.has(code)) return;
          const raw = (row as any).overallKpiValuePercent ?? (row as any).OverallKpiValuePercent ?? 0;
          percentLookup.set(code, Number(raw) || 0);
        });

        const regionMap = new Map<string, Set<string>>();
        (regions ?? []).forEach((row) => {
          const regionName = (row as any).region ?? (row as any).Region ?? 'Unknown';
          const areaCode = (row as any).leaCode ?? (row as any).LeaCode ?? '';
          if (!areaCode) return;
          const set = regionMap.get(regionName) ?? new Set<string>();
          set.add(areaCode);
          regionMap.set(regionName, set);
        });

        const uniqueRegions = new Set<string>();
        const uniqueEngineers = new Set<string>();
        const uniqueProvinces = new Set<string>();
        const uniqueLeas = new Set<string>();
        (regions ?? []).forEach((row) => {
          const regionName = (row as any).region ?? (row as any).Region ?? '';
          if (regionName) uniqueRegions.add(regionName.trim());

          const engineer = this.normalizeName((row as any).networkEngineer ?? (row as any).NetworkEngineer ?? '');
          if (engineer) uniqueEngineers.add(engineer);

          const province = this.normalizeName((row as any).province ?? (row as any).Province ?? '');
          if (province) uniqueProvinces.add(province);

          const leaCode = this.normalizeName((row as any).leaCode ?? (row as any).LeaCode ?? '');
          if (leaCode) uniqueLeas.add(leaCode);
        });
        this.regionCount = uniqueRegions.size;
        this.engineerCount = uniqueEngineers.size;
        this.provinceCount = uniqueProvinces.size;
        this.leaCount = uniqueLeas.size;

        this.regions = Array.from(regionMap.entries())
          .map(([regionName, areaCodes]) => {
            const meters = Array.from(areaCodes)
              .map((code) => {
                const normalizedCode = this.normalizeArea(code);
                const label = rtomLookup.get(normalizedCode) || code;
                const engineer = engineerLookup.get(normalizedCode);
                return { code, label, engineer } as MeterData;
              })
              .sort((a, b) => a.label.localeCompare(b.label));
            return { title: regionName, meters } as RegionData;
          })
          .sort((a, b) => this.sortRegionNames(a.title, b.title));

        const totals: TotalsData = {};
        percentLookup.forEach((value, code) => {
          totals[code] = value;
        });
        this.totals = totals;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.error = 'Unable to load dashboard data.';
        this.loading = false;
        this.regions = [];
        this.totals = {};
        this.regionCount = 0;
        this.engineerCount = 0;
        this.provinceCount = 0;
        this.leaCount = 0;
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeArea(value: string): string {
    return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  }

  private normalizeName(value: string): string {
    return String(value ?? '').trim();
  }

  valueForMeter(meter: MeterData): number {
    const key = this.normalizeArea(meter.code);
    const exact = this.totals[key];
    return Number.isFinite(exact) ? exact : 0;
  }

  getMaxValue(meters: MeterData[]): number {
    const values = meters.map((m) => this.valueForMeter(m));
    return values.length ? Math.max(...values) : 0;
  }

  isMaxValue(meter: MeterData, meters: MeterData[]): boolean {
    const value = this.valueForMeter(meter);
    const max = this.getMaxValue(meters);
    return Math.abs(value - max) < 0.0001 && max > 0;
  }

  getProgressBarColor(meter: MeterData, meters: MeterData[]): string {
    const value = this.valueForMeter(meter);
    const isMax = this.isMaxValue(meter, meters);

    if (isMax) {
      // 10% Accent - Green for good KPIs
      return '#28A745';
    }

    // 30% Secondary - SLT Blue with opacity
    const opacity = value / 100;
    return `rgba(0, 87, 166, ${opacity})`;
  }

  getMeterTextColor(meter: MeterData, meters: MeterData[]): string {
    // 10% Accent - Green for max values (good KPIs)
    return this.isMaxValue(meter, meters) ? '#28A745' : '#000';
  }

  getMeterFontWeight(meter: MeterData, meters: MeterData[]): string {
    return this.isMaxValue(meter, meters) ? 'bold' : 'normal';
  }

  getEngineerForMeter(meter: MeterData): string {
    const key = this.normalizeArea(meter.code);
    const raw = meter.engineer || this.engineerLookup.get(key) || '—';
    if (raw && raw !== '—') {
      const parenIndex = raw.indexOf('(');
      if (parenIndex !== -1) {
        return raw.substring(0, parenIndex).trim();
      }
    }
    return raw;
  }

  getCircularProgressBackground(meter: MeterData, meters: MeterData[]): string {
    const value = this.valueForMeter(meter);
    const maxValue = 102; // Match React's maxValue
    const normalizedValue = Math.min(value, maxValue);

    // Color based on value thresholds
    const color = this.getColorForValue(value);

    // Light grey trail
    const trailColor = '#E0E0E0';

    return `conic-gradient(${color} 0% ${normalizedValue}%, ${trailColor} ${normalizedValue}% 100%)`;
  }

  getColorForValue(value: number): string {
    if (value > 80) {
      return '#28A745'; // Green
    } else if (value >= 30) {
      return '#FFC107'; // Yellow
    } else {
      return '#DC3545'; // Red
    }
  }

  getProgressTextColor(meter: MeterData, meters: MeterData[]): string {
    // 10% Accent - Green for max values (good KPIs)
    return this.isMaxValue(meter, meters) ? '#28A745' : '#000';
  }

  // Fix: Add Object reference for template
  get Object() {
    return Object;
  }

  trackByRegion(index: number, region: RegionData): string {
    return region.title;
  }

  formatRegionTitle(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    const regionMatch = raw.match(/^region\s*(\d+)/i);
    if (regionMatch) {
      const numberValue = Number(regionMatch[1]);
      return `Region ${Number.isFinite(numberValue) ? numberValue : regionMatch[1]}`;
    }

    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  trackByMeter(index: number, meter: MeterData): string {
    return meter.code;
  }

  openMeterDetails(region: RegionData, meter: MeterData): void {
    console.log('🎯 Opening meter details for:', { region: region.title, meter: meter.label, code: meter.code });
    const areaKey = this.normalizeArea(meter.code);
    const matchingRegion = this.regionRows.find((row) =>
      this.normalizeArea((row as any).leaCode ?? (row as any).LeaCode ?? '') === areaKey
    );
    console.log('📍 Matching region found:', matchingRegion);

    const networkEngineer = matchingRegion?.networkEngineer ?? '—';
    const province = matchingRegion?.province ?? '—';
    const regionName = matchingRegion?.region ?? region.title;
    const leaCode = matchingRegion?.leaCode ?? meter.code;

    const rows = this.overallRows.filter((row) =>
      this.normalizeArea((row as any).areaCode ?? (row as any).AreaCode ?? '') === areaKey
    );

    const totalMaximumPoints = rows.reduce(
      (sum, row) => sum + Number((row as any).maximumPointsPerKpi ?? (row as any).MaximumPointsPerKpi ?? 0),
      0
    );

    const totalPointsAchieved = rows.reduce(
      (sum, row) => sum + Number((row as any).pointsAchieved ?? (row as any).PointsAchieved ?? 0),
      0
    );

    const overallPercentRaw = rows[0]?.overallKpiValuePercent;
    const overallPercent = Number.isFinite(Number(overallPercentRaw))
      ? Number(overallPercentRaw)
      : totalMaximumPoints > 0
        ? (totalPointsAchieved / totalMaximumPoints) * 100
        : 0;

    const kpiRows: MeterKpiRow[] = rows.map((row) => {
      const defId = Number((row as any).kpiDefinitionId ?? (row as any).KpiDefinitionId ?? 0);
      return {
        kpiDefinitionId: defId,
        kpiName: String((row as any).kpiName ?? (row as any).KpiName ?? ''),
        achievedKpi: Number((row as any).achievedKpi ?? (row as any).AchievedKpi ?? 0),
        maximumPointsPerKpi: Number((row as any).maximumPointsPerKpi ?? (row as any).MaximumPointsPerKpi ?? 0),
        pointsAchieved: Number((row as any).pointsAchieved ?? (row as any).PointsAchieved ?? 0),
        category: this.kpiCategoryMap.get(defId) ?? ''
      };
    });

    this.selectedRegionTitle = regionName;
    const key = this.normalizeArea(meter.code);
    const fullEngineer = meter.engineer || this.engineerLookup.get(key) || networkEngineer || '—';
    const areaDisplay = meter.label || meter.code;
    const compositeDisplay = fullEngineer && fullEngineer !== '—' ? `${fullEngineer} (${areaDisplay})` : areaDisplay;
    const networkEngineerValue = fullEngineer !== '—' ? fullEngineer : networkEngineer;
    this.selectedDetails = {
      region: regionName,
      province,
      networkEngineer: networkEngineerValue,
      leaCode,
      displayName: compositeDisplay,
      overallPercent: Number(overallPercent.toFixed(2)),
      totalMaximumPoints: Number(totalMaximumPoints.toFixed(4)),
      totalPointsAchieved: Number(totalPointsAchieved.toFixed(4)),
      kpiRows,
    };
    console.log('✅ Modal details set:', this.selectedDetails);
  }

  splitEngineerName(engineer: string): { code: string; name: string } {
    if (!engineer || engineer === '—') {
      return { code: '—', name: '' };
    }
    const parenIndex = engineer.indexOf('(');
    if (parenIndex !== -1) {
      const code = engineer.substring(0, parenIndex).trim();
      let name = engineer.substring(parenIndex + 1);
      const closeParenIndex = name.indexOf(')');
      if (closeParenIndex !== -1) {
        name = name.substring(0, closeParenIndex);
      }
      return { code, name: name.trim() };
    }
    return { code: engineer, name: '' };
  }

  closeDetails(): void {
    this.selectedDetails = null;
    this.selectedRegionTitle = '';
  }

  getKpiRowClass(row: any): string {
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
