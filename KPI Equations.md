# KPI Equations

1. IP Network Operations KPI Availability

Availability (%) = ((Total Minutes - Unavailable Minutes) /  (24 × 60 × Days in Month × Total Nodes)) × 100

1. BB & ANW KPI Availability

Availability (%) =  ((Total Minutes - Unavailable Minutes) / (24 × 60 × Days in Month × Total Nodes)) × 100

1. OTN Operator 1 KPI Availability

Availability (%) = ((Total Minutes - Unavailable Minutes) / (24 × 60 × Days in Month × Total Nodes)) × 100

1. OTN Operator 2 SLA Compliance

SLA Compliance (%) = (Links SLA Not Violated / Total Failed Links) × 100

1. Service Fulfilment KPI

Achieved KPI = KPI Value

1. Other Operator – Fault SLA KPI

Fault SLA (%) = (Faults Within SLA / Total Faults) × 100

1. Other Operator – Fault Clearance KPI

Clearance Rate (%) = (Cleared Within 4 Hours / Total Clearance Faults) × 100

1. Other Operator – Repeated Fault KPI

Repeated Fault Percentage = (Repeated Faults / Total Customers) × 100

Achieved KPI = 100 − Repeated Fault Percentage

1. Aged Network Failure KPI

If HasUnavailability = 1: 

Achieved KPI = 0

Otherwise:
Achieved KPI = 100

1. Points Achieved Calculation (No Target Defined)

Points Achieved = Maximum Points × (Achieved KPI / 100)

1. Points Achieved Calculation (Target Defined)

If Achieved KPI > Target:
Points Achieved = Maximum Points

Otherwise:
Points Achieved = Maximum Points × (Achieved KPI / Target)

1. Maximum Points Allocation (Node-Based KPIs)

Maximum Points = Points Applicable × (Area Nodes / Total Nodes)

1. Maximum Points Allocation (Equal Share KPIs)

Maximum Points = Points Applicable / Number of Areas

1. Overall KPI Percentage

Overall KPI (%) = (Total Points Achieved / Total Maximum Points) × 100