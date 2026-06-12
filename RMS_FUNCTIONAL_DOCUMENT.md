# Resource Management System Functional Document

## 1. Document Overview

### Purpose

The purpose of this document is to define the business functionality, workflows, user roles, governance rules, approval behavior, reporting needs, and operational scope of the Resource Management System.

### Scope

The Resource Management System supports centralized workforce planning, resource demand management, skill-based matching, manual allocation, role-off governance, bench management, utilization tracking, and reporting. The system is intended to help business, delivery, and resource management teams plan, assign, monitor, and optimize workforce capacity across clients and projects.

### Intended Audience

- Business stakeholders
- Delivery managers
- Resource managers
- Project managers
- Product owners
- QA teams
- Development teams
- Support and operations teams

### Definitions & Acronyms

| Term | Description |
| --- | --- |
| RMS | Resource Management System |
| HRMS | Human Resource Management System |
| PMS | Project Management System |
| SLA | Service Level Agreement |
| Bench | Available resources not currently allocated to billable or active project work |
| Allocation | Assignment of a resource to a project or demand for a defined period and percentage |
| Role-Off | Planned or emergency removal of a resource from a project |
| Utilization | Percentage of resource capacity consumed by project or billable work |
| Demand | A project staffing requirement raised for one or more resources |

## 2. Business Overview

### Business Problem

Organizations often struggle to identify available resources, match employee skills to project demands, track utilization, reduce bench costs, and manage resource transitions between projects. Without a centralized system, workforce planning becomes reactive, manual, and difficult to govern.

### Solution

The RMS provides a centralized platform for workforce planning, demand intake, allocation governance, utilization monitoring, bench tracking, and resource transition management. It enables stakeholders to make informed staffing decisions based on resource availability, skills, project demand, utilization, and approval status.

## 3. User Roles & Permission Matrix

| Function | Admin | Resource Manager | Project Manager | Delivery Manager |
| --- | --- | --- | --- | --- |
| Client creation | Yes | No | No | No |
| Client edit and activation | Yes | View | No | View |
| Project context view | Yes | Yes | Yes | Yes |
| Demand creation | No | No | Yes | Yes |
| Demand approval | View | View | Submit | Approve |
| Resource search | Yes | Yes | View | View |
| Resource allocation | Yes | Manage | View | Approve |
| Allocation conflict review | Yes | Manage | View | Approve |
| Role-off initiation | View | Manage | Initiate | Approve |
| Bench management | View | Manage | View | View |
| Utilization dashboard | Yes | Yes | Yes | Yes |
| Skill and role template management | Yes | Manage | View | View |
| Reports and exports | Yes | Yes | Yes | Yes |
| Audit history view | Yes | Yes | View | View |

## 4. End-to-End Business Process

The RMS lifecycle follows the complete staffing and resource governance flow:

```text
Client
  ↓
Project
  ↓
Resource Demand
  ↓
Approval
  ↓
Allocation
  ↓
Utilization
  ↓
Role-Off
  ↓
Bench
  ↓
Reallocation
```

This flow ensures that resource planning begins with client and project context, proceeds through approved demand creation and allocation, and continues through utilization monitoring, role-off, bench governance, and future reassignment.

## 5. Module-Wise Functional Requirements

### Module 1: Client & Account Context Management

#### Objective

Manage client-specific business context used for resource planning, staffing governance, and compliance.

#### Functional Features

**Client Management**

- Create client profiles.
- Edit client information.
- Activate and deactivate clients.
- Search and filter clients.
- Export client information.

**Client Governance**

- Configure SLA rules.
- Configure escalation levels.
- Define compliance requirements.
- Assign delivery models.
- Maintain audit history for client-level changes.

**Asset Management**

- Create assets.
- Assign assets to resources or projects.
- Return assigned assets.
- Edit asset information.
- Delete asset records, where permitted by governance rules.

#### Business Rules

- A client must be active before it can be associated with a project.
- SLA rules are mandatory for strategic clients.
- Compliance requirements must be maintained before staffing is allowed.
- Client changes must be logged in audit history.

### Module 2: Project Context Consumption

#### Objective

Consume and validate project context required for resource demand planning and staffing readiness.

#### Functional Features

- Integrate with PMS for project data consumption.
- Synchronize project records.
- Evaluate staffing readiness.
- Apply delivery risk tagging.
- Validate project governance information.
- Support emergency bypass where business-critical staffing is required.

#### Business Rules

- Only active projects can create demands.
- Project start and end dates must be valid.
- Client-project mapping is mandatory.
- Emergency bypass must be auditable and approval-controlled.

### Module 3: Workforce Master & Availability Engine

#### Objective

Maintain resource master data and calculate effective resource availability for staffing decisions.

#### Functional Features

- Synchronize employee data from HRMS.
- Track employment status.
- Integrate approved leave data.
- Consume timesheet data.
- Calculate net availability.
- Identify bench resources.
- Forecast future capacity.

#### Business Rules

- Availability must consider current allocations.
- Availability must consider approved leave.
- Availability must consider notice period status.
- Availability must consider shadow allocations.
- Inactive employees must not be available for new allocation.

### Module 4: Skill, Role & Capability Management

#### Objective

Maintain skill, role, and capability data required for resource matching and workforce planning.

#### Functional Features

- Maintain skill taxonomy.
- Define skill categories.
- Define sub-skills.
- Maintain proficiency levels.
- Manage certifications.
- Configure role templates.
- Perform skill gap analysis.

#### Business Rules

- Mandatory skills must be fulfilled before a resource is considered a valid match.
- Expired certifications cannot be considered valid.
- Skill audit history must be maintained.
- Role templates must include required skills, preferred skills, proficiency levels, and experience expectations.

### Module 5: Resource Demand Management

#### Objective

Manage project staffing demand from creation through approval, allocation, fulfillment, and closure.

#### Functional Features

- Create resource demands.
- Classify demand by type, project, role, skill, priority, and criticality.
- Manage criticality.
- Route demand through approval workflow.
- Track demand aging.
- Modify demand details.
- Cancel demand.
- Generate replacement demand when required.

#### Demand Lifecycle

```text
Draft
  ↓
Submitted
  ↓
Approved
  ↓
Allocated
  ↓
Fulfilled
  ↓
Closed
```

#### Business Rules

- Demand must belong to a valid project.
- Duplicate demand creation is prohibited.
- Critical demands receive staffing priority.
- Approved demand is required before allocation.
- Demand changes after approval must be audited.

### Module 6: Manual Resource Allocation Management

#### Objective

Support manual resource selection, approval, assignment, conflict validation, and allocation closure.

#### Functional Features

- Search and match resources against demand.
- Create partial allocations.
- Support multi-project allocations.
- Detect allocation conflicts.
- Identify over-allocation scenarios.
- Roll back allocation changes where permitted.
- Close completed allocations.

#### Allocation Lifecycle

```text
Requested
  ↓
Approved
  ↓
Allocated
  ↓
Completed
```

#### Business Rules

- Total allocation for a resource cannot exceed 100% without approval.
- Over-allocation requires approval.
- Allocation changes must be audited.
- Allocation start and end dates must fall within valid project and demand dates.
- Partial allocation must clearly define allocation percentage and duration.

### Module 7: Role-Off & Deallocation Management

#### Objective

Manage planned and emergency removal of resources from projects while maintaining staffing continuity and availability accuracy.

#### Functional Features

- Initiate planned role-off.
- Initiate emergency role-off.
- Capture role-off reason and effective date.
- Perform impact analysis.
- Route role-off through approval workflow.
- Recalculate resource availability after role-off.
- Generate replacement demand where required.

#### Business Rules

- Role-off reason is mandatory.
- Role-off approval is required before final deallocation, except approved emergency scenarios.
- Replacement demand may be generated automatically.
- Resource availability must be recalculated after role-off completion.
- Role-off actions must be audited.

### Module 8: Bench & Internal Pool Management

#### Objective

Identify, categorize, monitor, and prioritize available internal resources for future staffing.

#### Functional Features

- Identify bench resources.
- Categorize bench resources.
- Track bench aging.
- Calculate cost exposure.
- Search bench resources.
- Manage internal talent pools.
- Prioritize bench resources for open demands.

#### Bench Categories

| Category | Description |
| --- | --- |
| Ready | Available and ready for allocation |
| Training | Available but currently undergoing training or capability building |
| Shadow | Assigned in shadow capacity or pending transition to full allocation |

#### Business Rules

- Bench aging must be tracked.
- Bench resources should be prioritized during staffing.
- Bench category must be updated when resource status changes.
- Long-aging bench resources must trigger alerts.

### Module 9: Utilization & Performance Management

#### Objective

Track resource utilization, billability, performance visibility, and staffing efficiency through dashboards and reports.

#### Functional Features

- Consume timesheet data.
- Calculate utilization.
- Track billable and non-billable allocation.
- Analyze utilization trends.
- Generate under-utilization and over-utilization alerts.
- Provide operational and leadership dashboards.

#### Business Rules

- Utilization calculations are read-only.
- Missing timesheets impact utilization confidence.
- Billable and non-billable utilization must be distinguishable.
- Utilization data must align with allocation and timesheet inputs.

## 6. Business Rules & Governance

### Allocation Governance

- Total allocation should not exceed 100% unless approved.
- Allocation requires approved demand.
- Allocation changes must be logged.
- Allocation conflicts must be reviewed before confirmation.

### Demand Governance

- Demand must be created against an active project.
- Duplicate demands are not allowed.
- Critical demands must receive priority in staffing queues.
- Demand cancellation must capture reason and audit details.

### Bench Governance

- Bench aging must be monitored.
- Bench resources should be prioritized before external hiring or non-bench allocation.
- Bench aging alerts must be triggered after configured threshold periods.

### Audit Governance

- All critical actions must be logged.
- Approval decisions must capture approver, timestamp, status, and comments.
- Changes to client, project, demand, allocation, role-off, bench, and skill data must be traceable.

### Compliance Governance

- Client compliance requirements must be maintained before staffing.
- Expired certifications must not satisfy mandatory staffing criteria.
- Emergency bypass actions must be auditable.

## 7. Approval Workflows

### Demand Approval

```text
Project Manager
  ↓
Delivery Manager
  ↓
Approved
```

### Allocation Approval

```text
Resource Manager
  ↓
Delivery Manager
  ↓
Approved
```

### Role-Off Approval

```text
Project Manager
  ↓
Delivery Manager
  ↓
Approved
```

### Emergency Bypass Approval

```text
Initiator
  ↓
Delivery Manager
  ↓
Audited Exception
```

## 8. Notifications & Alerts

The RMS should notify relevant users for operational events and governance exceptions.

| Notification / Alert | Trigger |
| --- | --- |
| Demand created | New demand is submitted |
| Demand approval pending | Demand waits for approval |
| Demand aging | Demand remains open beyond threshold |
| Demand approved | Demand is approved for staffing |
| Demand rejected | Demand approval is rejected |
| Allocation conflict | Resource allocation conflicts with existing allocation, leave, or availability |
| Over-utilization | Resource utilization exceeds configured threshold |
| Under-utilization | Resource utilization falls below configured threshold |
| Bench aging | Bench duration exceeds configured threshold |
| Role-off initiated | Planned or emergency role-off is submitted |
| Role-off approved | Role-off request is approved |
| Replacement demand generated | Role-off or staffing gap creates replacement need |
| Missing timesheet | Expected timesheet data is unavailable |

## 9. Reports & Dashboards

### Operational Reports

- Resource availability report
- Demand report
- Allocation report
- Bench report
- Role-off report
- Skill gap report
- Asset assignment report
- Demand aging report

### Leadership Dashboards

- Utilization dashboard
- Capacity dashboard
- Staffing dashboard
- Bench dashboard
- Demand fulfillment dashboard
- Allocation trend dashboard
- Cost exposure dashboard

### Report Capabilities

- Search and filter data.
- Export report data.
- View current and historical trends.
- Drill down by client, project, role, skill, location, resource, and time period.

## 10. Assumptions & Dependencies

### Assumptions

- HRMS is the source of truth for employee master data.
- PMS is the source of truth for project master data.
- Leave management system provides approved leave information.
- Timesheet system provides actual work and utilization input.
- Approval hierarchy and role permissions are maintained accurately.
- Resource allocation percentages are maintained consistently across projects.

### Dependencies

| Dependency | Purpose |
| --- | --- |
| HRMS | Employee master data, employment status, notice period, designation, department |
| PMS | Project data, client-project mapping, project dates, project status |
| Leave Management | Approved leave and future absence data |
| Timesheet Management | Actual effort, billable hours, non-billable hours, utilization calculation |
| Authentication / SSO | User identity, login, access control |
| Notification Service | Email, in-app alerts, workflow reminders |

## 11. Out of Scope

- Payroll processing.
- Performance appraisal processing.
- Recruitment applicant tracking.
- Automated AI-based allocation decisions, unless introduced as a future enhancement.
- Client billing and invoicing.

## 12. Success Metrics

- Reduced average demand fulfillment time.
- Improved resource utilization visibility.
- Reduced bench aging and bench cost exposure.
- Improved accuracy of available capacity forecasting.
- Faster identification of suitable resources.
- Better governance over allocation, role-off, and demand approvals.

