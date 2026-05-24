/* File: otn-op1.service.ts
   Description: OTN Operations 1 KPI service
   Purpose: Manages OTN OP1 KPI data with site-level availability metrics.
*/

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ========== DATA INTERFACES ========== */

/* OTN Operations KPI */
export interface OtnOpKpi {
  /* Unique KPI identifier */
  id: number;
  /* Network engineer responsible */
  networkEngineerKpi: string;
  /* Division/department */
  division?: string;
  /* Section/team */
  section?: string;
  /* Overall KPI percentage */
  kpiPercent?: number;
}

/* OTN Operations KPI creation payload */
export interface CreateOtnOpKpi {
  /* Network engineer responsible */
  networkEngineerKpi: string;
  /* Division/department */
  division?: string;
  /* Section/team */
  section?: string;
  /* Overall KPI percentage */
  kpiPercent?: number;
}

/* OTN OP1 metric - site-level availability tracking */
export interface OtnOp1Metric {
  /* Unique metric identifier */
  id: number;
  /* Foreign key to OTN OP1 KPI */
  otnOp1Id: number;
  /* Site name/code */
  site: string;
  /* Minutes site was unavailable */
  unavailableMinutes: number;
  /* Total operational minutes */
  totalMinutes: number;
  /* Total number of nodes at site */
  totalNodes: number;
  /* Metric year */
  year: number;
  /* Metric month */
  month: number;
}

/* ========== OTN OP1 SERVICE ========== */

@Injectable({
  providedIn: 'root'
})
export class OtnOp1Service {
  /* Backend API base URL */
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all OtnOp1 KPIs
   */
  getAllKpis(): Observable<OtnOpKpi[]> {
    return this.http.get<OtnOpKpi[]>(`${this.apiUrl}/OtnOp1`);
  }

  /**
   * Create a new OtnOp1 KPI
   */
  createKpi(payload: CreateOtnOpKpi): Observable<OtnOpKpi> {
    return this.http.post<OtnOpKpi>(`${this.apiUrl}/OtnOp1`, payload);
  }

  /**
   * Update an existing OtnOp1 KPI
   */
  updateKpi(id: number, payload: CreateOtnOpKpi): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/OtnOp1/${id}`, payload);
  }

  /**
   * Delete an OtnOp1 KPI
   */
  deleteKpi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/OtnOp1/${id}`);
  }

  /**
   * Get metrics for a specific OtnOp1 KPI by year and month
   */
  getMetrics(id: number, year: number, month: number): Observable<OtnOp1Metric[]> {
    return this.http.get<OtnOp1Metric[]>(
      `${this.apiUrl}/OtnOp1/${id}/metrics?year=${year}&month=${month}`
    );
  }

  /**
   * Upsert (create or update) metrics for an OtnOp1 KPI
   */
  upsertMetrics(id: number, metrics: OtnOp1Metric[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/OtnOp1/${id}/metrics`, metrics);
  }
}
