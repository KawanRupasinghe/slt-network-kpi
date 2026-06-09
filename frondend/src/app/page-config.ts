/* File: page-config.ts
   Description: Navigation configuration
   Purpose: Defines navigation options for Overall, Platform, and Admin sections.
*/

/* ========== DATA INTERFACES ========== */

/* Navigation option structure */
export interface NavOption {
  /* Display label for navigation item */
  label: string;
  /* Route path */
  path: string;
  /* Page title for header */
  title: string;
}

/* ========== OVERALL KPI NAVIGATION ========== */

export const overallNavOptions: NavOption[] = [
  {
    label: 'Overall KPI Table',
    path: 'overall/current-month',
    title: 'Overall KPI — Current Month'
  }
];

/* ========== PLATFORM KPI NAVIGATION ========== */

export const platformNavOptions: NavOption[] = [
  {
    label: 'Service Fulfilment',
    path: 'platform/service-fulfilment',
    title: 'Platform KPI — Service Fulfilment'
  },
  {
    label: 'Enterprise KPI',
    path: 'platform/enterprise-kpi',
    title: 'Platform KPI — Enterprise KPI'
  },
  {
    /* Removed: Other Operator KPI */
    label: 'Other KPI',
    path: 'platform/other-kpi',
    title: 'Platform KPI — Other KPI'
  },
  {
    label: 'IP NW OP',
    path: 'platform/ip-nw-op',
    title: 'Platform KPI — IP NW OP'
  },
  {
    label: 'BB ANW',
    path: 'platform/bb-anw',
    title: 'Platform KPI — BB ANW'
  },
  {
    label: 'OTN OP',
    path: 'platform/otn-op',
    title: 'Platform KPI — OTN OP'
  },
  {
    label: 'Tower Maintenance',
    path: 'platform/tm-activity-plan',
    title: 'Platform KPI — Tower Maintenance'
  },
  {
    label: 'Routine MTNC',
    path: 'platform/routine-mtnc',
    title: 'Platform KPI — Routine MTNC'
  },
  {
    label: 'Other Operator',
    path: 'platform/tower-mtce-achievement',
    title: 'Platform KPI — Other Operator'
  }
];

/* ========== ADMIN MANAGEMENT NAVIGATION ========== */

export const adminNavOptions: NavOption[] = [
  {
    label: 'Admin Registration',
    path: 'admin/admin-registration',
    title: 'Admin — Admin Registration'
  },
  {
    label: 'User Registration',
    path: 'admin/user-registration',
    title: 'Admin — User Registration'
  },
  {
    label: 'Service Fulfilment',
    path: 'admin/service-fulfilment',
    title: 'Admin — Service Fulfilment'
  },
  {
    label: 'Region Management',
    path: 'admin/region-management',
    title: 'Admin — Region Management'
  },
  {
    label: 'IP NW OP',
    path: 'admin/ip-nw-op',
    title: 'Admin — IP NW OP'
  },
  {
    label: 'BB ANW',
    path: 'admin/bb-anw',
    title: 'Admin — BB ANW'
  },
  {
    label: 'OTN OP 1',
    path: 'admin/otn-op-1',
    title: 'Admin — OTN OP 1'
  },
  {
    label: 'OTN OP 2',
    path: 'admin/otn-op-2',
    title: 'Admin — OTN OP 2'
  },
  {
    label: 'Other Operator',
    path: 'admin/tower-mtce-achievement',
    title: 'Admin — Other Operator'
  },
  {
    label: 'Tower Maintenance',
    path: 'admin/tm-activity-plan',
    title: 'Admin — Tower Maintenance'
  },
  {
    label: 'Routine MTNC',
    path: 'admin/routine-mtnc',
    title: 'Admin — Routine MTNC'
  },
  {
    label: 'E-mail Service',
    path: 'admin/email-service',
    title: 'Admin — E-mail Service'
  },
  {
    label: 'KPI Management',
    path: 'admin/final-table',
    title: 'Admin — KPI Management'
  },
  {
    label: 'Enterprise KPI',
    path: 'admin/enterprise-kpi',
    title: 'Admin — Enterprise KPI'
  },
  {
    label: 'Other KPI',
    path: 'admin/other-kpi',
    title: 'Admin — Other KPI'
  }
];

export const infoPages = [
  ...overallNavOptions,
  ...platformNavOptions,
  ...adminNavOptions
];
