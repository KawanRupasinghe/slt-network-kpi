import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TelemetryRecord {
  id: number;
  designation: string;   // matches Telemetry.Designation — same as networkengineer in RegionData
  year: number;
  month: number;
  percentage: number;
  node_Count: number | null;
}

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly base = `${environment.apiUrl}/telemetry`;

  constructor(private http: HttpClient) {}

  getAll(year: number, month: number): Observable<TelemetryRecord[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<TelemetryRecord[]>(this.base, { params });
  }
}
