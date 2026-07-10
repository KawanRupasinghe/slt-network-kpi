/* File: other-operator-kpi.service.ts
   Description: Other Operator KPI admin service
   Purpose: CRUD operations for Other Operator KPI definitions.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OtherOperatorKpiRecord {
  id: number;
  networkEngineerKpi: string;
  division?: string;
  section?: string;
  kpiPercent?: number;
}

export interface CreateOtherOperatorKpi {
  networkEngineerKpi: string;
  division?: string;
  section?: string;
  kpiPercent?: number;
}

export interface OtherOperatorTargetDto {
  id: number;
  otherOperatorKpiId: number;
  networkEngineerKpi?: string;
  division?: string;
  section?: string;
  month: number;
  year: number;
}

export interface CreateOtherOperatorTargetDto {
  otherOperatorKpiId: number;
  section?: string;
  month: number;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class OtherOperatorKpiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<OtherOperatorKpiRecord[]> {
    return this.http.get<OtherOperatorKpiRecord[]>(`${this.apiUrl}/OtherOperatorKpi`);
  }

  create(payload: CreateOtherOperatorKpi): Observable<OtherOperatorKpiRecord> {
    return this.http.post<OtherOperatorKpiRecord>(`${this.apiUrl}/OtherOperatorKpi`, payload);
  }

  update(id: number, payload: CreateOtherOperatorKpi): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/OtherOperatorKpi/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/OtherOperatorKpi/${id}`);
  }

  // =========================
  // TARGETS
  // =========================
  getTargets(): Observable<OtherOperatorTargetDto[]> {
    return this.http.get<OtherOperatorTargetDto[]>(`${this.apiUrl}/other-operator-targets`);
  }

  createTarget(payload: CreateOtherOperatorTargetDto): Observable<OtherOperatorTargetDto> {
    return this.http.post<OtherOperatorTargetDto>(`${this.apiUrl}/other-operator-targets`, payload);
  }

  updateTarget(id: number, payload: CreateOtherOperatorTargetDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/other-operator-targets/${id}`, payload);
  }

  deleteTarget(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/other-operator-targets/${id}`);
  }
}
