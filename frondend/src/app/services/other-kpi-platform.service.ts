import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface OtherKpiDto {
  id?: number | string;
  networkEngineerKpi: string;
  division: string;
  section: string;
  kpiPercent: number;
  displayOrder?: number;
}

export interface OtherMetricDto {
  id?: number | string;
  otherKpiId?: number | string;
  networkEngineerKpi?: string;
  division?: string;
  section?: string;
  kpiPercent?: number;
  site: string;
  totalFaults?: number | null;
  faultsWithinSla?: number | null;
  repeatedFaults?: number | null;
  totalCustomers?: number | null;
  totalClearanceFaults?: number | null;
  clearedWithin4Hrs?: number | null;
  month: number;
  year: number;
}

export interface UpsertOtherMetricRequest {
  otherKpiId: number;
  site: string;
  totalFaults?: number | null;
  faultsWithinSla?: number | null;
  repeatedFaults?: number | null;
  totalCustomers?: number | null;
  totalClearanceFaults?: number | null;
  clearedWithin4Hrs?: number | null;
  month: number;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class OtherKpiPlatformService {
  private readonly apiUrl = `${environment.apiUrl}/OtherKpi`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<OtherKpiDto[]> {
    return this.http.get<OtherKpiDto[]>(this.apiUrl).pipe(
      map((items) =>
        items.map((item, index) => ({
          ...item,
          displayOrder: (item as any).no ?? index + 1
        }))
      )
    );
  }

  getMetrics(month: number, year: number, site?: string): Observable<OtherMetricDto[]> {
    let params = new HttpParams()
      .set('month', month.toString())
      .set('year', year.toString());

    if (site) {
      params = params.set('site', site);
    }

    return this.http.get<OtherMetricDto[]>(`${this.apiUrl}/metrics`, { params });
  }

  upsertMetric(request: UpsertOtherMetricRequest): Observable<OtherMetricDto> {
    return this.http.post<OtherMetricDto>(`${this.apiUrl}/metrics`, request);
  }
}
