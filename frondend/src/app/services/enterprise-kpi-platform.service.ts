import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EnterpriseKpiDto {
  id?: number | string;
  networkEngineerKpi: string;
  division: string;
  section: string;
  kpiPercent: number;
  displayOrder?: number;
}

interface EnterpriseMetricResponse {
  id?: number | string;
  networkEngineerKpi: string;
  division: string;
  section: string;
  kpiPercent: number;
  area: string;
  kpi_value: number;
  month: number;
  year: number;
}

export interface EnterpriseMetricDto {
  id?: number | string;
  networkEngineerKpi: string;
  division: string;
  section: string;
  kpiPercent: number;
  area: string;
  kpiValue: number;
  month: number;
  year: number;
}

export interface UpsertEnterpriseMetricRequest {
  enterpriseKpiId: number;
  areaCode: string;
  kpiValue: number | null;
  month: number;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class EnterpriseKpiPlatformService {
  private readonly apiUrl = `${environment.apiUrl}/EnterpriseKpi`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EnterpriseKpiDto[]> {
    return this.http.get<EnterpriseKpiDto[]>(this.apiUrl).pipe(
      map((items) =>
        items.map((item, index) => ({
          ...item,
          displayOrder: (item as any).no ?? index + 1
        }))
      )
    );
  }

  getMetrics(month: number, year: number, area?: string): Observable<EnterpriseMetricDto[]> {
    let params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());

    if (area) {
      params = params.set('area', area);
    }

    return this.http.get<EnterpriseMetricResponse[]>(`${this.apiUrl}/metrics`, { params }).pipe(
      map((items) =>
        items.map((item) => ({
          id: item.id,
          networkEngineerKpi: item.networkEngineerKpi,
          division: item.division,
          section: item.section,
          kpiPercent: item.kpiPercent,
          area: item.area,
          kpiValue: item.kpi_value,
          month: item.month,
          year: item.year
        }))
      )
    );
  }

  upsertMetric(request: UpsertEnterpriseMetricRequest): Observable<EnterpriseMetricDto> {
    return this.http.post<EnterpriseMetricResponse>(`${this.apiUrl}/metrics`, request).pipe(
      map((item) => ({
        id: item.id,
        networkEngineerKpi: item.networkEngineerKpi,
        division: item.division,
        section: item.section,
        kpiPercent: item.kpiPercent,
        area: item.area,
        kpiValue: item.kpi_value,
        month: item.month,
        year: item.year
      }))
    );
  }
}