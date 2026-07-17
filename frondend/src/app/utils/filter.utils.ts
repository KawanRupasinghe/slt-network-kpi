export class FilterUtils {
  private static allMonths: Array<{ label: string; value: number }> = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  static generateYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const startYear = Math.max(currentYear - 1, 2026);
    const years: number[] = [];
    for (let year = startYear; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }

  static getMonthOptions(selectedYear?: number): Array<{ label: string; value: number }> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (selectedYear === 2026) {
      return FilterUtils.allMonths.filter(m => m.value > 3);
    }

    if (selectedYear === currentYear) {
      return FilterUtils.allMonths.filter(m => m.value <= currentMonth);
    }

    return FilterUtils.allMonths;
  }
}
