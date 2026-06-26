/* File: enterprise-kpi.service.ts
   Description: Enterprise KPI admin service
   Purpose: CRUD operations for Enterprise KPI definitions.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EnterpriseKpiRecord {
  id: number;
  networkEngineerKpi: string;
  division?: string;
  section?: string;
  kpiPercent?: number;
}

export interface CreateEnterpriseKpi {
  networkEngineerKpi: string;
  division?: string;
  section?: string;
  kpiPercent?: number;
}

@Injectable({ providedIn: 'root' })
export class EnterpriseKpiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EnterpriseKpiRecord[]> {
    return this.http.get<EnterpriseKpiRecord[]>(`${this.apiUrl}/EnterpriseKpi`);
  }

  create(payload: CreateEnterpriseKpi): Observable<EnterpriseKpiRecord> {
    return this.http.post<EnterpriseKpiRecord>(`${this.apiUrl}/EnterpriseKpi`, payload);
  }

  update(id: number, payload: CreateEnterpriseKpi): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/EnterpriseKpi/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/EnterpriseKpi/${id}`);
  }
}
