import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as ExcelJS from 'exceljs';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { TmActivityService } from '../../../../services/tm-activity.service';

type ProcessedDetail = {
  Column1: string;
  Column2: number | string;
  Column3: number | string;
  Column4?: number | string;
};

type ProcessedRecord = {
  month: string;
  details: ProcessedDetail[];
};

type HardcodedRecord = {
  _id?: string;
  no: number | string;
  kpi: string;
  target: string;
  calculation: string;
};

type TowerSums = Partial<Record<string, number>>;

const MONTH_ORDER = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const MOCK_PROCESSED_DATA: ProcessedRecord[] = [
  {
    month: 'January',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 8, Column4: '8' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 14, Column4: '8' },
      { Column1: 'NW/EP', Column2: '5', Column3: 5, Column4: '5' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 9, Column4: '9' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 4, Column4: '4' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 4, Column4: '9' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 4, Column4: '4' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '3' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 4, Column4: '4' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 0, Column4: '5' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPE', Column2: '2', Column3: 1, Column4: '2' },
      { Column1: 'NW/WPN', Column2: '4', Column3: 1, Column4: '4' },
      { Column1: 'NW/WPNE', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 1, Column4: '2' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPSW', Column2: '2', Column3: 0, Column4: '2' }
    ]
  },
  {
    month: 'February',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 8, Column4: '16' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 8, Column4: '16' },
      { Column1: 'NW/EP', Column2: '5', Column3: 4, Column4: '10' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 9, Column4: '18' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 4, Column4: '8' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 9, Column4: '18' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 4, Column4: '8' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 6, Column4: '6' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 4, Column4: '8' },
      { Column1: 'NW/SPE', Column2: '10', Column3: 18, Column4: '19' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 10, Column4: '10' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 9, Column4: '14' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 1, Column4: '3' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 4, Column4: '7' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 9, Column4: '7' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 2, Column4: '4' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 1, Column4: '3' }
    ]
  },
  {
    month: 'March',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 8, Column4: '24' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 6, Column4: '24' },
      { Column1: 'NW/EP', Column2: '5', Column3: 6, Column4: '15' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 10, Column4: '27' },
      { Column1: 'NW/NP-1', Column2: '2', Column3: 2, Column4: '10' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 14, Column4: '27' },
      { Column1: 'NW/NWPE', Column2: '3', Column3: 3, Column4: '11' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 3, Column4: '9' },
      { Column1: 'NW/SAB', Column2: '5', Column3: 3, Column4: '13' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 8, Column4: '28' },
      { Column1: 'NW/SPW', Column2: '6', Column3: 6, Column4: '16' },
      { Column1: 'NW/UVA', Column2: '8', Column3: 6, Column4: '22' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 2, Column4: '4' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 5, Column4: '10' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 2, Column4: '10' },
      { Column1: 'NW/WPS', Column2: '1', Column3: 2, Column4: '5' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '6' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 2, Column4: '4' }
    ]
  },
  {
    month: 'April',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 8, Column4: '8' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 14, Column4: '8' },
      { Column1: 'NW/EP', Column2: '5', Column3: 6, Column4: '5' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 8, Column4: '9' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 4, Column4: '4' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 5, Column4: '9' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 4, Column4: '4' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 2, Column4: '3' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 4, Column4: '4' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 9, Column4: '9' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 5, Column4: '5' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 6, Column4: '7' },
      { Column1: 'NW/WPE', Column2: '2', Column3: 1, Column4: '2' },
      { Column1: 'NW/WPN', Column2: '4', Column3: 2, Column4: '4' },
      { Column1: 'NW/WPNE', Column2: '4', Column3: 7, Column4: '4' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 2, Column4: '2' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPSW', Column2: '2', Column3: 0, Column4: '2' }
    ]
  },
  {
    month: 'May',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '16' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 3, Column4: '16' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '10' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '18' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '18' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 1, Column4: '6' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/SPE', Column2: '10', Column3: 0, Column4: '19' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 0, Column4: '10' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 1, Column4: '14' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 0, Column4: '3' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 0, Column4: '3' }
    ]
  },
  {
    month: 'June',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '24' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '24' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '15' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '27' },
      { Column1: 'NW/NP-1', Column2: '2', Column3: 0, Column4: '10' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '27' },
      { Column1: 'NW/NWPE', Column2: '3', Column3: 0, Column4: '11' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '9' },
      { Column1: 'NW/SAB', Column2: '3', Column3: 0, Column4: '11' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 0, Column4: '28' },
      { Column1: 'NW/SPW', Column2: '6', Column3: 0, Column4: '16' },
      { Column1: 'NW/UVA', Column2: '8', Column3: 0, Column4: '22' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 0, Column4: '10' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 0, Column4: '10' },
      { Column1: 'NW/WPS', Column2: '1', Column3: 0, Column4: '5' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '6' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 0, Column4: '4' }
    ]
  },
  {
    month: 'July',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '8' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '8' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '5' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '3' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 0, Column4: '5' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPE', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPN', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPNE', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPSW', Column2: '2', Column3: 0, Column4: '2' }
    ]
  },
  {
    month: 'August',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '16' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '16' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '10' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '18' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '18' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '6' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/SPE', Column2: '10', Column3: 0, Column4: '19' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 0, Column4: '10' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 0, Column4: '14' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 0, Column4: '3' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 0, Column4: '3' }
    ]
  },
  {
    month: 'September',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '24' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '24' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '15' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '27' },
      { Column1: 'NW/NP-1', Column2: '2', Column3: 0, Column4: '10' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '27' },
      { Column1: 'NW/NWPE', Column2: '3', Column3: 0, Column4: '11' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '9' },
      { Column1: 'NW/SAB', Column2: '3', Column3: 0, Column4: '11' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 0, Column4: '28' },
      { Column1: 'NW/SPW', Column2: '6', Column3: 0, Column4: '16' },
      { Column1: 'NW/UVA', Column2: '8', Column3: 0, Column4: '22' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 0, Column4: '10' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 0, Column4: '10' },
      { Column1: 'NW/WPS', Column2: '1', Column3: 0, Column4: '5' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '6' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 0, Column4: '4' }
    ]
  },
  {
    month: 'October',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '8' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '8' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '5' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '3' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 0, Column4: '9' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 0, Column4: '5' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPE', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPN', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPNE', Column2: '4', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '2' },
      { Column1: 'NW/WPSW', Column2: '2', Column3: 0, Column4: '2' }
    ]
  },
  {
    month: 'November',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '16' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '16' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '10' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '18' },
      { Column1: 'NW/NP-1', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '18' },
      { Column1: 'NW/NWPE', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '6' },
      { Column1: 'NW/SAB', Column2: '4', Column3: 0, Column4: '8' },
      { Column1: 'NW/SPE', Column2: '10', Column3: 0, Column4: '19' },
      { Column1: 'NW/SPW', Column2: '5', Column3: 0, Column4: '10' },
      { Column1: 'NW/UVA', Column2: '7', Column3: 1, Column4: '14' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 0, Column4: '3' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 0, Column4: '7' },
      { Column1: 'NW/WPS', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 0, Column4: '3' }
    ]
  },
  {
    month: 'December',
    details: [
      { Column1: 'NW/CPN', Column2: '8', Column3: 0, Column4: '24' },
      { Column1: 'NW/CPS', Column2: '8', Column3: 0, Column4: '24' },
      { Column1: 'NW/EP', Column2: '5', Column3: 0, Column4: '15' },
      { Column1: 'NW/NCP', Column2: '9', Column3: 0, Column4: '27' },
      { Column1: 'NW/NP-1', Column2: '2', Column3: 0, Column4: '10' },
      { Column1: 'NW/NP-2', Column2: '9', Column3: 0, Column4: '27' },
      { Column1: 'NW/NWPE', Column2: '3', Column3: 0, Column4: '11' },
      { Column1: 'NW/NWPW', Column2: '3', Column3: 0, Column4: '9' },
      { Column1: 'NW/SAB', Column2: '3', Column3: 0, Column4: '11' },
      { Column1: 'NW/SPE', Column2: '9', Column3: 0, Column4: '28' },
      { Column1: 'NW/SPW', Column2: '6', Column3: 0, Column4: '16' },
      { Column1: 'NW/UVA', Column2: '8', Column3: 0, Column4: '22' },
      { Column1: 'NW/WPE', Column2: '1', Column3: 0, Column4: '4' },
      { Column1: 'NW/WPN', Column2: '3', Column3: 0, Column4: '10' },
      { Column1: 'NW/WPNE', Column2: '3', Column3: 0, Column4: '10' },
      { Column1: 'NW/WPS', Column2: '1', Column3: 0, Column4: '5' },
      { Column1: 'NW/WPSE', Column2: '2', Column3: 0, Column4: '6' },
      { Column1: 'NW/WPSW', Column2: '1', Column3: 0, Column4: '4' }
    ]
  }
];

const MOCK_HARDCODED_DATA: HardcodedRecord[] = [
  {
    no: 1,
    kpi: 'Proper maintaining and cleaning of tower sites',
    target: '100% adherence',
    calculation: 'Completed visits / Planned visits'
  },
  {
    no: 2,
    kpi: 'Visual inspection of aviation lighting systems',
    target: '95% compliance',
    calculation: 'Sites with compliant lighting / Total inspected'
  },
  {
    no: 3,
    kpi: 'Earthing resistance measurement',
    target: '< 2 Ohms',
    calculation: 'Sites within threshold / Total measured'
  }
];

const TABLE_TITLES = [
  '2. Proper maintaining and cleaning of tower sites, access roads, tower leg bases, and guy bases.',
  '3. Visual inspection of tower condition, aviation lighting system, etc.',
  '4. Measure earth readings and inspect Earthing system.'
];

@Component({
  selector: 'app-tm-activity-plan',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './tm-activity-plan.component.html',
  styleUrls: ['./tm-activity-plan.component.scss']
})
export class TmActivityPlanComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly tmActivityService = inject(TmActivityService);
  private readonly cdr = inject(ChangeDetectorRef);

  pageTitle = 'Tower Maintenance';
  headers: string[] = [];
  towerSums: TowerSums = {};
  calculatedValues: string[] = [];
  tableData: ProcessedRecord[] = [...MOCK_PROCESSED_DATA];
  hardcodedTableData: HardcodedRecord[] = [...MOCK_HARDCODED_DATA];
  loading = false;
  errorMessage = '';
  readonly tableTitles = TABLE_TITLES;

  /* ===================== FILTER STATE ===================== */

  private readonly now = new Date();

  selectedMonth: number = this.now.getMonth() + 1;   // 1-indexed (1 = January)
  selectedYear: number  = this.now.getFullYear();

  readonly monthOptions: { value: number; label: string }[] = [
    { value:  1, label: 'January'   },
    { value:  2, label: 'February'  },
    { value:  3, label: 'March'     },
    { value:  4, label: 'April'     },
    { value:  5, label: 'May'       },
    { value:  6, label: 'June'      },
    { value:  7, label: 'July'      },
    { value:  8, label: 'August'    },
    { value:  9, label: 'September' },
    { value: 10, label: 'October'   },
    { value: 11, label: 'November'  },
    { value: 12, label: 'December'  }
  ];

  yearOptions: number[] = [
    this.now.getFullYear(),
    this.now.getFullYear() - 1,
    this.now.getFullYear() - 2
  ];

  /* ===================== FILTER HANDLERS ===================== */

  onMonthChange(month: number): void {
    this.selectedMonth = Number(month);
    this.applyFilters();
  }

  onYearChange(year: number): void {
    this.selectedYear = Number(year);
    this.applyFilters();
  }

  private applyFilters(): void {
    this.calculatedValues = this.calculateFirstTableValues(this.tableData, this.headers);
    this.cdr.detectChanges();
  }

  /* ------------------------------------------------- */

  ngOnInit(): void {
    this.processDerivedData(this.tableData);
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;
    this.errorMessage = '';

    // Fetch KPI definitions from TmActivityService
    this.tmActivityService.getAll().pipe(
      catchError(err => {
        console.error('Failed to fetch TM Activity plans from service', err);
        this.setError('Unable to load Tower Maintenance KPI definitions. Showing cached snapshot.');
        return of([...MOCK_HARDCODED_DATA]);
      }),
      finalize(() => {

        this.cdr.detectChanges();
      })
    ).subscribe(hardcoded => {
      // Use processed mock data (since /api/ProcessedDataFetch1 doesn't exist)
      //this.tableData = [...MOCK_PROCESSED_DATA];/
      this.loading = false;
      this.http.get<any[]>(`${environment.apiUrl}/tower-mtc/fetchTower`)
        .pipe(
          catchError(err => {
            console.error('Tower API error:', err);
            this.setError('Failed to load tower data. Using fallback.');
            return of([]);
          })
        )
        .subscribe(apiData => {
          console.log('✅ TOWER RESPONSE:', apiData);

          if (apiData && apiData.length) {
            this.tableData = this.convertToProcessedFormat(apiData);
          } else {
            this.tableData = [...MOCK_PROCESSED_DATA];
          }

          // ✅ MUST be here
          this.processDerivedData(this.tableData);
        });




      // Convert ActivityRecord[] to HardcodedRecord[]
      this.hardcodedTableData = (hardcoded && hardcoded.length)
        ? hardcoded.map(activity => ({
            no: typeof activity.no === 'string' ? parseInt(activity.no) : activity.no,
            kpi: activity.kpi,
            target: activity.target,
            calculation: activity.calculation
          }))
        : [...MOCK_HARDCODED_DATA];
      this.processDerivedData(this.tableData);
    });
  }

  exportToExcel(): void {
    if (!this.headers.length) {
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tower Maintenance Plan');

    const baseColumns = [
      'No',
      'KPI',
      'Target',
      'Calculation'
    ];
    const totalColumnsFirstTable = baseColumns.length + this.headers.length;

    worksheet.mergeCells(1, 1, 1, totalColumnsFirstTable);
    worksheet.getCell(1, 1).value = 'Tower Maintenance Activity Plan';
    worksheet.getCell(1, 1).font = { bold: true, size: 14 };
    worksheet.getCell(1, 1).alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([...baseColumns, ...this.headers]);
    this.styleHeaderRow(headerRow);

    this.hardcodedTableData.forEach(record => {
      const row = worksheet.addRow([
        record.no ?? '-',
        record.kpi ?? '-',
        record.target ?? '-',
        record.calculation ?? '-',
        ...this.calculatedValues.map(v => `${v}%`)
      ]);
      this.addBorder(row);
    });

    worksheet.addRow([]);
    worksheet.addRow([]);

    this.tableTitles.forEach(title => {
      const totalColumns = 1 + this.headers.length * 2;
      const titleRow = worksheet.addRow([title]);
      worksheet.mergeCells(titleRow.number, 1, titleRow.number, totalColumns);
      titleRow.font = { bold: true, size: 12 };
      titleRow.alignment = { horizontal: 'center' };

      const dynamicHeaders = ['Month', ...this.headers.flatMap(h => [`${h} Distribution`, `${h} Achievement`])];
      const dynamicHeaderRow = worksheet.addRow(dynamicHeaders);
      this.styleHeaderRow(dynamicHeaderRow);

      const towersRow = worksheet.addRow([
        '# Towers',
        ...this.headers.flatMap(h => [this.towerSums[h] ?? 0, ''])
      ]);
      this.addBorder(towersRow);

      this.tableData.forEach(entry => {
        const row = worksheet.addRow([
          entry.month,
          ...this.headers.flatMap(header => [
            this.getDetailValue(entry, header, 'Column2'),
            this.getDetailValue(entry, header, 'Column3')
          ])
        ]);
        this.addBorder(row);
      });

      worksheet.addRow([]);
    });

    worksheet.columns.forEach(column => {
      column.width = 18;
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Tower_Maintenance_Plan.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  getDetailValue(entry: ProcessedRecord, header: string, column: 'Column2' | 'Column3'): string {
    const detail = entry.details.find(item => item.Column1 === header);
    const raw = detail ? (detail[column] ?? '') : '';
    return raw === '' ? '-' : String(raw);
  }

  trackByHeader = (_: number, header: string) => header;
  trackByMonth = (_: number, record: ProcessedRecord) => record.month;

  private processDerivedData(data: ProcessedRecord[]): void {
    const sorted = this.sortByMonth(data);
    this.headers = this.buildHeaders(sorted);
    this.towerSums = this.calculateTowerSums(sorted);
    this.calculatedValues = this.calculateFirstTableValues(sorted, this.headers);
  }

  private sortByMonth(data: ProcessedRecord[]): ProcessedRecord[] {
    return [...data].sort(
      (a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
    );
  }
  private convertToProcessedFormat(apiData: any[]): ProcessedRecord[] {
    return (apiData || []).map(item => ({
      month: item.month,
      details: Object.keys(item.data || {}).map(key => ({
        Column1: key,
        Column2: item.data[key]?.column2 ?? '-',
        Column3: item.data[key]?.column3 ?? '-',
        Column4: item.data[key]?.column4 ?? ''   // optional
      }))
    }));
  }


  private buildHeaders(data: ProcessedRecord[]): string[] {
    const unique = new Set<string>();
    data.forEach(entry => {
      entry.details.forEach(detail => {
        if (detail.Column1) {
          unique.add(detail.Column1);
        }
      });
    });
    return Array.from(unique);
  }

  private calculateTowerSums(data: ProcessedRecord[]): TowerSums {
    const sums: TowerSums = {};
    const firstThree = data.slice(0, 3);
    firstThree.forEach(entry => {
      entry.details.forEach(detail => {
        const current = sums[detail.Column1] ?? 0;
        const value = Number(detail.Column2) || 0;
        sums[detail.Column1] = Number((current + value).toFixed(2));
      });
    });
    return sums;
  }

  private calculateFirstTableValues(data: ProcessedRecord[], headers: string[]): string[] {
    if (!headers.length) {
      return [];
    }

    // Derive quarter months from the selected filter month
    const quarterEndByMonth: Record<number, string> = {
      1: 'March', 2: 'March', 3: 'March',
      4: 'June',  5: 'June',  6: 'June',
      7: 'September', 8: 'September', 9: 'September',
      10: 'December', 11: 'December', 12: 'December'
    };

    const quarterEnd = quarterEndByMonth[this.selectedMonth];

    const quarters: Record<string, string[]> = {
      March:     ['January', 'February', 'March'],
      June:      ['April', 'May', 'June'],
      September: ['July', 'August', 'September'],
      December:  ['October', 'November', 'December']
    };

    const selectedMonths = quarters[quarterEnd];
    if (!selectedMonths) {
      return headers.map(() => '100.00');
    }

    return headers.map(header => {
      let totalAchievement = 0;
      let totalDistribution = 0;

      data.forEach(monthEntry => {
        if (selectedMonths.includes(monthEntry.month)) {
          const detail = monthEntry.details.find(item => item.Column1 === header);
          if (detail) {
            totalAchievement += Number(detail.Column3) || 0;
            totalDistribution += Number(detail.Column2) || 0;
          }
        }
      });

      if (totalDistribution === 0) {
        return '0.00';
      }

      return ((totalAchievement / totalDistribution) * 100).toFixed(2);
    });
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0070C0' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      this.addBorderToCell(cell);
    });
  }

  private addBorder(row: ExcelJS.Row): void {
    row.eachCell(cell => this.addBorderToCell(cell));
  }

  private addBorderToCell(cell: ExcelJS.Cell): void {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  private setError(message: string): void {
    if (!this.errorMessage) {
      this.errorMessage = message;
    }
  }
}
