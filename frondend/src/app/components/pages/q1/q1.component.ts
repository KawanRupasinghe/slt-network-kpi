import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RegionService } from '../../../services/region.service';

@Component({
  selector: 'app-q1',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './q1.component.html',
  styleUrls: ['./q1.component.scss']
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

  constructor(private regionService: RegionService) {
    const now = new Date();
    this.currentYear = 2026; // Hardcode to 2026 as per example? No, the example says "Detailed KPI metrics for {Selected Month Name} 2026". I'll use 2026 or current year. Let's use 2026 for default year to match example, or just use current year.
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
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.syncDisplayedPeriod();
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
        // Flatten regions to count engineers just like in CurrentMonthComponent
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
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed loading regions:', err);
        this.engineersCount = 0;
        this.loading = false;
      },
    });
  }
}
