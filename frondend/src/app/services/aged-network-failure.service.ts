import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AgedNetworkFailureMetric {
  id: number;
  areaCode: string;
  platformType: string;
  hasUnavailability: number; // 0 or 1
  month: number;
  year: number;
}

export interface UpsertAgedNetworkFailureMetric {
  areaCode: string;
  platformType: string; // BB_ANW | OTN_OP | IP_NW_OP
  hasUnavailability: number;
  month: number;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class AgedNetworkFailureService {
  private readonly base = `${environment.apiUrl}/aged-network-failure-metrics`;

  constructor(private http: HttpClient) {}

  get(areaCode: string, month: number, year: number, platformType?: string): Observable<AgedNetworkFailureMetric[]> {
    let params = new HttpParams()
      .set('areaCode', areaCode)
      .set('month', month)
      .set('year', year);
    if (platformType) params = params.set('platformType', platformType);
    return this.http.get<AgedNetworkFailureMetric[]>(this.base, { params });
  }

  upsert(dto: UpsertAgedNetworkFailureMetric): Observable<AgedNetworkFailureMetric> {
    return this.http.post<AgedNetworkFailureMetric>(this.base, dto);
  }
}
