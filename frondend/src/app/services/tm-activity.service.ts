/* File: tm-activity.service.ts
   Description: TM Activity Plans service
   Purpose: Manages TM (Telecom Management) Activity Plan CRUD operations.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ========== DATA INTERFACES ========== */

/* Activity plan record */
export interface ActivityRecord {
  /* Unique activity plan identifier */
  id?: number;
  /* Record number */
  no: string;
  /* KPI name */
  kpi: string;
  /* Target value */
  target: string;
  /* Calculation method */
  calculation: string;
}

/* ========== TM ACTIVITY SERVICE ========== */

@Injectable({
  providedIn: 'root'
})
export class TmActivityService {
  /* Backend API base URL */
  private apiBase = `${environment.apiUrl}/TmActivityPlans`;

  constructor(private http: HttpClient) {}

  /* Retrieve all activity plans */
  getAll(): Observable<ActivityRecord[]> {
    return this.http.get<ActivityRecord[]>(this.apiBase);
  }

  /* Create new activity plan */
  add(data: Omit<ActivityRecord, 'id'>): Observable<ActivityRecord> {
    return this.http.post<ActivityRecord>(this.apiBase, data);
  }

  /* Update existing activity plan */
  update(id: number, data: Partial<ActivityRecord>): Observable<ActivityRecord> {
    return this.http.put<ActivityRecord>(`${this.apiBase}/${id}`, data);
  }

  /* Delete activity plan by ID */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${id}`);
  }
}
