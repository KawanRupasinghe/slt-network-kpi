import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PowerAndACRecord {
  id: number;
  designation: string;
  year: number;
  month: number;
  scheduled: number;
  attended: number;
  cumulative_Sched: number;
  cumulative_Achieved: number;
}

@Injectable({ providedIn: 'root' })
export class PowerAndACService {
  private readonly base = `${environment.apiUrl}/powerandac`;

  constructor(private http: HttpClient) {}

  getByYear(year: number): Observable<PowerAndACRecord[]> {
    const params = new HttpParams().set('year', year);
    return this.http.get<PowerAndACRecord[]>(this.base, { params });
  }
}
