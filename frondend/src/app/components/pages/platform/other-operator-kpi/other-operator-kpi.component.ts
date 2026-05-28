import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../../services/auth.service';
import { OtherOperatorKpiPlatformService } from '../../../../services/other-operator-kpi-platform.service';
import { RegionService } from '../../../../services/region.service';
import { BaseOtherKpiMetricsComponent } from '../other-kpi/other-kpi.component';

@Component({
  selector: 'app-other-operator-kpi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../other-kpi/other-kpi.component.html',
  styleUrls: ['../other-kpi/other-kpi.component.scss']
})
export class OtherOperatorKpiComponent extends BaseOtherKpiMetricsComponent {
  constructor(
    toastr: ToastrService,
    otherOperatorKpiService: OtherOperatorKpiPlatformService,
    regionService: RegionService,
    authService: AuthService,
    cdr: ChangeDetectorRef
  ) {
    super('Other Operator KPI', 'OTHER OPERATOR KPI', toastr, otherOperatorKpiService, regionService, authService, cdr);
  }
}
