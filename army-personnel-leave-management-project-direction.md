# Army Personnel & Leave Management System — Full Project Direction

> **Project type:** Internal personnel + leave management web application  
> **Target size:** ~155–160 personnel/users  
> **Development budget:** ৳30,000  
> **Delivery commitment:** 30 days  
> **Frontend/backend framework:** Next.js App Router + TypeScript  
> **Database:** PostgreSQL  
> **ORM:** Prisma ORM  
> **UI:** Tailwind CSS + shadcn/ui  
> **Primary roles:** Admin, Moderator, User  
> **Final approval authorities:** Commander and Quarter Master  
>
> **Important architecture rule:** Commander and Quarter Master are **not additional application roles**. They are designated approval authorities attached to eligible users. RBAC remains exactly three roles: `ADMIN`, `MODERATOR`, `USER`.

---

## 1. Product Goal

Build a secure, clean, responsive internal web system to manage:

- personnel records
- unit/section hierarchy
- leave applications
- moderator review/recommendation
- final leave approval by Commander or Quarter Master
- leave balances
- leave conflicts
- leave calendar
- return-from-leave tracking
- overdue returns
- organization events
- notifications
- reports
- audit logs
- role-based dashboards

The system should be simple enough to maintain on a ৳30k project but architected cleanly enough that the application can later be extended without rewriting the core.

---

# 2. Final Role & Authority Model

## 2.1 Application Roles

### ADMIN

Global administrative access.

Can:

- manage personnel
- manage users
- assign roles
- manage units/sections
- assign moderators to units/sections
- manage leave types/rules
- manage leave balances
- see all leave requests
- see all reports
- manage events
- see audit logs
- manage system settings
- override/perform administrative corrections where permitted

### MODERATOR

Scoped operational role.

Can:

- see assigned unit/section personnel
- review assigned leave requests
- add remarks
- recommend / send back for correction
- create leave on behalf of assigned personnel
- see assigned personnel profiles
- see relevant calendar/events
- mark personnel returned where authorized
- apply own leave
- view own balance/history

### USER

Self-service role.

Can:

- view own profile
- apply for leave
- upload supporting attachment
- view own leave balance
- view own leave history
- view application status
- view leave calendar according to visibility rules
- view events
- receive notifications

---

# 3. Approval Authority Model

There are two final approval authorities:

```text
                 Leave Request
                      |
                      v
             Assigned Moderator
                      |
             Review + Recommendation
                      |
                      v
       +--------------+--------------+
       |                             |
       v                             v
 Commander                      Quarter Master
       |                             |
       +---------- APPROVE ----------+
                      |
                      v
                  APPROVED
```

## Key business rule

**Either Commander OR Quarter Master can give final approval.** One successful final approval is sufficient.

Possible final states:

- `APPROVED`
- `REJECTED`
- `RETURNED_FOR_CORRECTION`

Other stakeholders may receive notifications but have **no approval authority**.

### Recommended implementation

Use a user field:

```text
approvalAuthority:
  NONE
  COMMANDER
  QUARTER_MASTER
```

Do not create extra RBAC roles for these authorities.

This keeps authorization simple:

```text
role = ADMIN | MODERATOR | USER
approvalAuthority = NONE | COMMANDER | QUARTER_MASTER
```

An action requires both conditions where applicable:

```text
ADMIN            -> admin permission
MODERATOR        -> moderator permission + assigned scope
COMMANDER        -> designated approval authority
QUARTER_MASTER   -> designated approval authority
```

---

# 4. Main Modules

```text
1. Authentication & Session
2. Authorization / RBAC
3. Personnel Management
4. Unit & Section Management
5. User / Role Management
6. Leave Types & Rules
7. Leave Application
8. Moderator Review
9. Final Approval
10. Leave Balance Engine
11. Leave Conflict Detection
12. Leave Calendar
13. Return-from-Leave
14. Overdue Return Tracking
15. Events
16. Notifications
17. Reports & Export
18. Audit Logs
19. Dashboard & Analytics
20. System Settings
```

---

# 5. Frontend Screen Inventory

## Authentication

1. `/login`
2. `/forgot-password`
3. `/reset-password`

## Common

4. `/dashboard`
5. `/profile`
6. `/notifications`
7. `/calendar`
8. `/events`

## Personnel

9. `/personnel`
10. `/personnel/assigned`
11. `/personnel/new`
12. `/personnel/[id]`
13. `/personnel/[id]/edit`

## Organization

14. `/organization/units`
15. `/organization/units/[id]`
16. `/organization/sections`
17. `/organization/sections/[id]`

## User Management

18. `/users`
19. `/users/[id]`
20. `/users/new`

## Leave

21. `/leaves`
22. `/leaves/assigned`
23. `/leaves/apply`
24. `/leaves/my`
25. `/leaves/[id]`
26. `/leaves/[id]/review`
27. `/leaves/[id]/approve`
28. `/leaves/balances`
29. `/leaves/types`
30. `/leaves/rules`
31. `/leaves/returns`

## Events

32. `/events/new`
33. `/events/[id]/edit`

## Reports

34. `/reports`
35. `/reports/leave`
36. `/reports/personnel`
37. `/reports/overdue`
38. `/reports/audit`

## Administration

39. `/audit-logs`
40. `/settings`
41. `/settings/general`
42. `/settings/notifications`

> These routes are implementation-level routes. Some can share one UI screen and use permission-based tabs/filters.

---

# 6. Role-Based Screen Access

| Screen | Admin | Moderator | User |
|---|:---:|:---:|:---:|
| Login | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | ✓ |
| All Personnel | ✓ | — | — |
| Assigned Personnel | — | ✓ | — |
| Personnel Profile | ✓ | ✓ | own only |
| Personnel Add/Edit | ✓ | — | — |
| Units/Sections | ✓ | view assigned | — |
| User Management | ✓ | — | — |
| All Leave | ✓ | — | — |
| Assigned Leave | — | ✓ | — |
| Apply Leave | ✓* | ✓ | ✓ |
| Own Leave | ✓* | ✓ | ✓ |
| Leave Review | ✓ | ✓ | — |
| Final Approval | ✓** | designated authority | — |
| Leave Types | ✓ | — | — |
| Leave Rules | ✓ | — | — |
| Leave Calendar | ✓ | ✓ | ✓ |
| Events View | ✓ | ✓ | ✓ |
| Events Manage | ✓ | — | — |
| Reports | ✓ | limited/read-only if later enabled | — |
| Audit Logs | ✓ | — | — |
| Notifications | ✓ | ✓ | ✓ |
| Return Tracking | ✓ | ✓ | — |
| System Settings | ✓ | — | — |

`*` Admin/Moderator can apply for their own leave.  
`**` Admin can administer/correct; designated Commander/QM authority performs normal final approval.

---

# 7. Dashboard Design

## Admin Dashboard

Cards:

```text
Total Personnel
Present / Active
Currently On Leave
Pending Leave
Awaiting Final Approval
Overdue Returns
This Month Leave
Upcoming Events
```

Charts:

- monthly leave trend
- leave type distribution
- unit-wise leave counts
- personnel status distribution

Tables:

- pending requests
- currently absent personnel
- overdue returns
- upcoming events

## Moderator Dashboard

Scope only assigned personnel:

- assigned personnel count
- pending reviews
- recommended requests waiting final decision
- current leave
- upcoming returns
- overdue returns

## User Dashboard

- current personnel status
- leave balance cards
- pending application
- current/upcoming leave
- next return date
- upcoming events
- recent notifications

---

# 8. Personnel Management

## Personnel profile fields

### Identity

- employee/service ID
- full name
- photo
- rank/designation
- gender if required by organization
- blood group
- phone
- email

### Organization

- unit
- section
- supervisor
- assigned moderator
- current posting
- previous posting

### Service

- joining date
- posting date
- service status
- transfer/retirement information

### System

- user account status
- role
- approval authority
- last login

## Status values

```text
ACTIVE
ON_LEAVE
INACTIVE
TRANSFERRED
RETIRED
SUSPENDED
```

Keep personnel employment status separate from leave request status.

---

# 9. Unit & Section Structure

Recommended hierarchy:

```text
Organization
  └── Unit
        └── Section
              └── Personnel
                    └── User Account
```

Examples:

```text
Unit A
  ├── Section 1
  ├── Section 2
  └── Section 3

Unit B
  ├── Section 1
  └── Section 2
```

A moderator can be assigned to one or multiple units/sections.

Use explicit assignment tables so scope is enforceable at backend level.

---

# 10. Leave Types

Initial seed data:

- Annual Leave
- Casual Leave
- Medical Leave
- Earned Leave
- Special Leave
- Emergency Leave

But **do not hard-code leave types in UI**. Store them in the database so Admin can configure them.

Each leave type should have:

```text
name
code
description
isActive
requiresAttachment
defaultAllowance
minDays
maxDays
allowHalfDay
allowBackdated
requiresReturnDate
requiresApproval
```

---

# 11. Leave Application Form

Fields:

```text
Leave Type
Start Date
End Date
Total Days (auto)
Reason
Attachment (optional/required by leave type)
Contact During Leave
Address During Leave
Emergency Contact
Emergency Phone
```

UI should calculate total days instantly.

Do not trust client-calculated values. Backend recalculates the number of days before saving.

---

# 12. Leave Status Machine

Recommended states:

```text
DRAFT
PENDING_REVIEW
UNDER_REVIEW
RECOMMENDED
RETURNED_FOR_CORRECTION
PENDING_FINAL_APPROVAL
APPROVED
REJECTED
CANCELLED
ON_LEAVE
COMPLETED
OVERDUE
```

### Main transition

```text
DRAFT
  ↓
PENDING_REVIEW
  ↓
UNDER_REVIEW
  ├── RETURNED_FOR_CORRECTION → resubmit → UNDER_REVIEW
  ├── REJECTED
  └── RECOMMENDED
          ↓
    PENDING_FINAL_APPROVAL
          ↓
   +------+------+
   |             |
 Commander     Quarter Master
   |             |
   +---- APPROVE-+
          |
       APPROVED
          |
       start date
          |
       ON_LEAVE
          |
      return date
          |
      COMPLETED
```

Rejected at review or final approval is terminal unless a new request is submitted.

---

# 13. Leave Approval Logic

## Moderator

Moderator can only act on assigned scope.

Actions:

- open request
- inspect details
- inspect balance
- inspect conflicts
- add remarks
- recommend
- return for correction
- reject if business policy allows

## Final Approval

Normal final approval screen should show:

```text
Personnel
Unit / Section
Leave type
Dates
Total days
Balance before
Balance after
Conflict result
Moderator recommendation
Moderator remarks
Applicant reason
Attachments
Approval history
```

Commander or Quarter Master can:

- approve
- reject
- return for correction if policy allows
- add remarks

Do not allow two people to approve the same request twice. Use an atomic state transition/transaction.

---

# 14. Leave Balance Engine

Balance should be calculated from ledger data, not only a manually edited `remainingDays` field.

Recommended display:

```text
Allocated: 30
Used: 12
Pending: 3
Remaining: 15
```

Formula:

```text
remaining = allocated + adjustments - consumed - reserved
```

Where:

- `allocated` = yearly or policy allocation
- `adjustments` = approved manual adjustments
- `consumed` = completed/approved leave days according to policy
- `reserved` = approved/pending days that should temporarily hold balance

Define the exact policy before production because different leave policies may treat pending leave differently.

---

# 15. Leave Conflict Detection

Conflict means the same personnel already has another non-cancelled leave overlapping the requested date range.

Example:

```text
Existing:
10 Aug → 15 Aug

New request:
13 Aug → 18 Aug

Result:
CONFLICT
```

SQL-style overlap condition:

```text
existing.startDate <= requested.endDate
AND existing.endDate >= requested.startDate
```

Exclude:

- CANCELLED
- REJECTED

A conflict should block submission unless Admin explicitly overrides according to business policy.

---

# 16. Return From Leave

Each approved leave has:

```text
expectedReturnDate
actualReturnDate
returnStatus
returnRemarks
returnedBy
returnedAt
```

Return status:

```text
NOT_STARTED
ON_LEAVE
RETURNED
OVERDUE
```

Automatic rule:

```text
if today > expectedReturnDate AND actualReturnDate IS NULL
then status = OVERDUE
```

This can run dynamically during queries; a scheduled job is optional for the first version.

---

# 17. Events

Event fields:

- title
- description
- event type
- start date/time
- end date/time
- location
- audience type
- unit targeting
- section targeting
- personnel targeting
- created by
- status

Event types:

```text
TRAINING
MEETING
EXAM
PARADE
HOLIDAY
PROGRAM
OTHER
```

Audience:

```text
ALL
UNIT
SECTION
PERSONNEL
```

---

# 18. Notifications

Use in-app notifications first. No paid SMS is required for the base project.

Notification triggers:

```text
Leave submitted
Leave moved to review
Leave returned for correction
Leave recommended
Leave approved
Leave rejected
Leave starts tomorrow
Return due tomorrow
Return overdue
New event
```

Notification table should support:

```text
recipientId
actorId
type
title
message
entityType
entityId
isRead
readAt
createdAt
```

Optional later additions:

- email
- SMS
- push notifications

---

# 19. Audit Log

Audit log is mandatory because leave approval and personnel changes are sensitive.

Log:

```text
actor
action
entity
entityId
oldValue
newValue
reason
IP
userAgent
timestamp
```

Examples:

```text
Rahim approved leave #LV-1024

Moderator returned leave #LV-1024 for correction

Admin changed personnel unit from Unit A → Unit B

Admin changed leave allowance from 20 → 25
```

Audit logs should be append-only from the application layer.

---

# 20. Reports

Required reports:

### Personnel

- full personnel list
- unit-wise personnel
- section-wise personnel
- active/inactive/retired/transferred

### Leave

- individual leave statement
- monthly leave report
- date-range report
- pending requests
- approved requests
- rejected requests
- returned/correction requests
- unit-wise leave report
- leave-type report
- currently on leave
- overdue return report

### Export

- Excel `.xlsx`
- PDF

Export must respect filters.

Example:

```text
Unit = Unit A
Leave Type = Annual
Date = 01 Aug → 31 Aug
Status = APPROVED
```

Export only matching rows.

---

# 21. Search & Filters

Global search:

- employee ID
- full name
- rank
- phone
- unit
- section

Leave filters:

- status
- leave type
- date range
- unit
- section
- applicant

Personnel filters:

- role
- service status
- unit
- section
- approval authority

Use server-side pagination for lists even though there are only 160 users. This keeps architecture clean.

---

# 22. Recommended Database Architecture

Use PostgreSQL because the application is highly relational:

```text
users
personnel
units
sections
moderator_assignments
leave_types
leave_policies
leave_balances
leave_balance_adjustments
leave_requests
leave_attachments
leave_reviews
leave_approvals
leave_returns
notifications
events
event_audiences
audit_logs
system_settings
password_reset_tokens
sessions
```

Prisma should use real PostgreSQL foreign keys and indexes. Prisma documentation recommends relational foreign keys/relation definitions for relational databases. citeturn942487search4turn942487search12

---

# 23. Full Prisma-Oriented Data Model

Below is the recommended logical schema. Exact Prisma generator syntax can be adjusted to the installed Prisma version during implementation.

```prisma
enum UserRole {
  ADMIN
  MODERATOR
  USER
}

enum ApprovalAuthority {
  NONE
  COMMANDER
  QUARTER_MASTER
}

enum UserStatus {
  ACTIVE
  DISABLED
}

enum PersonnelStatus {
  ACTIVE
  ON_LEAVE
  INACTIVE
  TRANSFERRED
  RETIRED
  SUSPENDED
}

enum LeaveRequestStatus {
  DRAFT
  PENDING_REVIEW
  UNDER_REVIEW
  RETURNED_FOR_CORRECTION
  RECOMMENDED
  PENDING_FINAL_APPROVAL
  APPROVED
  REJECTED
  CANCELLED
  ON_LEAVE
  COMPLETED
  OVERDUE
}

enum ReviewDecision {
  RECOMMEND
  RETURN_FOR_CORRECTION
  REJECT
}

enum ApprovalDecision {
  APPROVE
  REJECT
  RETURN_FOR_CORRECTION
}

enum LeaveReturnStatus {
  NOT_STARTED
  ON_LEAVE
  RETURNED
  OVERDUE
}

enum EventAudienceType {
  ALL
  UNIT
  SECTION
  PERSONNEL
}

enum EventType {
  TRAINING
  MEETING
  EXAM
  PARADE
  HOLIDAY
  PROGRAM
  OTHER
}

enum NotificationType {
  LEAVE_SUBMITTED
  LEAVE_UNDER_REVIEW
  LEAVE_RETURNED
  LEAVE_RECOMMENDED
  LEAVE_APPROVED
  LEAVE_REJECTED
  LEAVE_STARTING
  RETURN_DUE
  RETURN_OVERDUE
  EVENT_CREATED
  SYSTEM
}

model User {
  id                   String            @id @default(cuid())
  email                String            @unique
  passwordHash         String
  role                 UserRole
  approvalAuthority    ApprovalAuthority @default(NONE)
  status               UserStatus        @default(ACTIVE)
  lastLoginAt          DateTime?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  personnel            Personnel?
  sessions             Session[]
  assignedModerators   ModeratorAssignment[] @relation("ModeratorAssignments")
  createdLeaveRequests LeaveRequest[]    @relation("LeaveCreatedBy")
  leaveRequests        LeaveRequest[]    @relation("LeaveApplicant")
  reviews              LeaveReview[]
  approvals            LeaveApproval[]
  leaveReturns         LeaveReturn[]
  notifications        Notification[]    @relation("NotificationRecipient")
  actedNotifications   Notification[]    @relation("NotificationActor")
  createdEvents        Event[]            @relation("EventCreator")
  auditLogs            AuditLog[]
  balanceAdjustments   LeaveBalanceAdjustment[]
  passwordResetTokens  PasswordResetToken[]
  systemSettings       SystemSetting[]
}

model Personnel {
  id                   String           @id @default(cuid())
  userId               String?          @unique
  serviceId            String           @unique
  fullName             String
  photoUrl             String?
  rank                 String
  phone                String?
  email                String?
  bloodGroup           String?
  joiningDate          DateTime?
  postingDate          DateTime?
  currentPosting       String?
  previousPosting      String?
  supervisorName       String?
  status               PersonnelStatus  @default(ACTIVE)
  unitId               String
  sectionId            String?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  user                 User?            @relation(fields: [userId], references: [id], onDelete: SetNull)
  unit                 Unit             @relation(fields: [unitId], references: [id])
  section              Section?         @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  leaveRequests        LeaveRequest[]
  leaveBalances        LeaveBalance[]
  leaveReturns         LeaveReturn[]
  eventAudiences       EventAudience[]  @relation("PersonnelEventAudience")

  @@index([unitId])
  @@index([sectionId])
  @@index([fullName])
  @@index([status])
}

model Unit {
  id           String       @id @default(cuid())
  name         String       @unique
  code         String       @unique
  description  String?
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  sections     Section[]
  personnel    Personnel[]
  assignments  ModeratorAssignment[]
  eventAudiences EventAudience[] @relation("UnitEventAudience")

  @@index([isActive])
}

model Section {
  id             String       @id @default(cuid())
  unitId         String
  name           String
  code           String
  description    String?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  unit           Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  personnel      Personnel[]
  assignments    ModeratorAssignment[]
  eventAudiences EventAudience[] @relation("SectionEventAudience")

  @@unique([unitId, name])
  @@unique([unitId, code])
  @@index([unitId])
}

model ModeratorAssignment {
  id          String    @id @default(cuid())
  moderatorId String
  unitId      String?
  sectionId   String?
  isActive    Boolean   @default(true)
  assignedAt  DateTime  @default(now())
  revokedAt   DateTime?

  moderator   User      @relation("ModeratorAssignments", fields: [moderatorId], references: [id], onDelete: Cascade)
  unit        Unit?     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  section     Section?  @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([moderatorId, isActive])
  @@index([unitId, isActive])
  @@index([sectionId, isActive])
}

model LeaveType {
  id                  String       @id @default(cuid())
  name                String       @unique
  code                String       @unique
  description         String?
  isActive            Boolean      @default(true)
  requiresAttachment  Boolean      @default(false)
  allowHalfDay        Boolean      @default(false)
  allowBackdated      Boolean      @default(false)
  defaultAllowance    Decimal?
  minDays             Decimal?
  maxDays             Decimal?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  requests            LeaveRequest[]
  balances            LeaveBalance[]
  policies            LeavePolicy[]
}

model LeavePolicy {
  id                String      @id @default(cuid())
  leaveTypeId       String
  effectiveFrom     DateTime
  effectiveTo       DateTime?
  allocationDays    Decimal
  carryForwardLimit Decimal?
  maxConsecutiveDays Decimal?
  requiresApproval  Boolean     @default(true)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  leaveType         LeaveType   @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)

  @@index([leaveTypeId, effectiveFrom])
}

model LeaveBalance {
  id            String      @id @default(cuid())
  personnelId   String
  leaveTypeId   String
  year          Int
  allocatedDays Decimal     @default(0)
  carryForward  Decimal     @default(0)
  adjustmentDays Decimal    @default(0)
  usedDays      Decimal     @default(0)
  reservedDays  Decimal     @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  personnel     Personnel   @relation(fields: [personnelId], references: [id], onDelete: Cascade)
  leaveType     LeaveType  @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)
  adjustments   LeaveBalanceAdjustment[]

  @@unique([personnelId, leaveTypeId, year])
  @@index([personnelId, year])
}

model LeaveBalanceAdjustment {
  id          String        @id @default(cuid())
  balanceId   String
  amount      Decimal
  reason      String
  createdById String
  createdAt   DateTime      @default(now())

  balance     LeaveBalance  @relation(fields: [balanceId], references: [id], onDelete: Cascade)
  createdBy   User          @relation(fields: [createdById], references: [id])

  @@index([balanceId])
}

model LeaveRequest {
  id                    String             @id @default(cuid())
  requestNumber         String             @unique
  personnelId           String
  applicantId           String?
  createdById            String
  leaveTypeId           String
  startDate             DateTime
  endDate               DateTime
  totalDays             Decimal
  reason                String
  contactDuringLeave    String?
  addressDuringLeave   String?
  emergencyContactName String?
  emergencyContactPhone String?
  status                LeaveRequestStatus @default(PENDING_REVIEW)
  submittedAt           DateTime?
  recommendedAt         DateTime?
  finalApprovedAt       DateTime?
  rejectedAt            DateTime?
  correctionCount       Int                @default(0)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  personnel             Personnel          @relation(fields: [personnelId], references: [id])
  applicant             User?              @relation("LeaveApplicant", fields: [applicantId], references: [id], onDelete: SetNull)
  createdBy             User               @relation("LeaveCreatedBy", fields: [createdById], references: [id])
  leaveType             LeaveType          @relation(fields: [leaveTypeId], references: [id])
  attachments           LeaveAttachment[]
  reviews               LeaveReview[]
  approvals             LeaveApproval[]
  returnRecord          LeaveReturn?

  @@index([personnelId, startDate, endDate])
  @@index([status])
  @@index([leaveTypeId])
  @@index([submittedAt])
}

model LeaveAttachment {
  id             String       @id @default(cuid())
  leaveRequestId String
  fileName       String
  fileUrl        String
  mimeType       String
  fileSize       Int
  uploadedById   String?
  createdAt      DateTime     @default(now())

  leaveRequest   LeaveRequest @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)

  @@index([leaveRequestId])
}

model LeaveReview {
  id             String         @id @default(cuid())
  leaveRequestId String
  reviewerId     String
  decision       ReviewDecision
  remarks        String?
  createdAt      DateTime       @default(now())

  leaveRequest   LeaveRequest   @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)
  reviewer       User           @relation(fields: [reviewerId], references: [id])

  @@index([leaveRequestId, createdAt])
}

model LeaveApproval {
  id              String           @id @default(cuid())
  leaveRequestId  String
  approverId      String
  authority       ApprovalAuthority
  decision        ApprovalDecision
  remarks         String?
  approvedAt      DateTime         @default(now())

  leaveRequest    LeaveRequest     @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)
  approver        User             @relation(fields: [approverId], references: [id])

  @@index([leaveRequestId, approvedAt])
}

model LeaveReturn {
  id               String              @id @default(cuid())
  leaveRequestId   String              @unique
  personnelId      String
  expectedReturnDate DateTime
  actualReturnDate DateTime?
  status           LeaveReturnStatus   @default(NOT_STARTED)
  remarks          String?
  markedReturnedById String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  leaveRequest     LeaveRequest        @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)
  personnel        Personnel           @relation(fields: [personnelId], references: [id])
  markedReturnedBy User?               @relation(fields: [markedReturnedById], references: [id], onDelete: SetNull)

  @@index([expectedReturnDate, status])
}

model Event {
  id          String      @id @default(cuid())
  title       String
  description String?
  type        EventType
  startAt     DateTime
  endAt       DateTime
  location    String?
  createdById String
  isPublished Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  createdBy   User        @relation("EventCreator", fields: [createdById], references: [id])
  audiences   EventAudience[]

  @@index([startAt, endAt])
}

model EventAudience {
  id           String            @id @default(cuid())
  eventId      String
  audienceType EventAudienceType
  unitId       String?
  sectionId    String?
  personnelId  String?

  event        Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  unit         Unit?             @relation("UnitEventAudience", fields: [unitId], references: [id], onDelete: Cascade)
  section      Section?          @relation("SectionEventAudience", fields: [sectionId], references: [id], onDelete: Cascade)
  personnel    Personnel?        @relation("PersonnelEventAudience", fields: [personnelId], references: [id], onDelete: Cascade)

  @@index([eventId])
  @@index([unitId])
  @@index([sectionId])
  @@index([personnelId])
}

model Notification {
  id          String           @id @default(cuid())
  recipientId String
  actorId     String?
  type        NotificationType
  title       String
  message     String
  entityType  String?
  entityId    String?
  isRead      Boolean          @default(false)
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  recipient   User             @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  actor       User?            @relation("NotificationActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([recipientId, isRead, createdAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String
  entityType String
  entityId   String?
  oldValue   Json?
  newValue   Json?
  reason     String?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  actor      User?    @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([actorId, createdAt])
  @@index([createdAt])
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  tokenHash    String   @unique
  expiresAt    DateTime
  lastSeenAt   DateTime @default(now())
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model PasswordResetToken {
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  updatedById String?
  updatedAt   DateTime @updatedAt

  updatedBy   User?    @relation(fields: [updatedById], references: [id], onDelete: SetNull)
}
```

Prisma's current PostgreSQL guidance supports PostgreSQL relations and explicit foreign-key-backed relations; Prisma's current docs also show a `prisma.config.ts` datasource configuration for modern setups. citeturn942487search3turn942487search5turn942487search9

---

# 24. Important Schema Notes

## Do not store these as duplicated source-of-truth values

Avoid relying solely on:

```text
User.remainingLeaveDays
Personnel.usedLeave
Personnel.pendingLeave
```

Those are derived values.

Use:

- leave balance records
- approved leave requests
- balance adjustment ledger

Then compute summary values.

## Keep personnel and account separate

One person can exist without an application account.

Therefore:

```text
Personnel 1 ─── 0..1 User
```

This allows Admin to create personnel records before activating their login.

---

# 25. Backend Architecture

Use Next.js App Router as a full-stack application. Next.js documents App Router as the newer router designed around modern React features and Server Components. citeturn942487search0

Recommended structure:

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── personnel/
│   │   ├── users/
│   │   ├── units/
│   │   ├── sections/
│   │   ├── leaves/
│   │   ├── calendar/
│   │   ├── events/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── audit-logs/
│   │   └── settings/
│   │
│   └── api/
│       ├── auth/
│       ├── users/
│       ├── personnel/
│       ├── units/
│       ├── sections/
│       ├── leave-types/
│       ├── leave-policies/
│       ├── leave-balances/
│       ├── leaves/
│       ├── approvals/
│       ├── reviews/
│       ├── returns/
│       ├── events/
│       ├── notifications/
│       ├── reports/
│       ├── audit-logs/
│       └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── personnel/
│   ├── leave/
│   ├── calendar/
│   ├── events/
│   ├── reports/
│   └── notifications/
│
├── features/
│   ├── auth/
│   ├── personnel/
│   ├── leave/
│   ├── units/
│   ├── events/
│   ├── reports/
│   └── notifications/
│
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── db/
│   ├── audit/
│   ├── notifications/
│   ├── leave/
│   ├── files/
│   ├── reports/
│   ├── validation/
│   └── utils/
│
├── server/
│   ├── services/
│   │   ├── leave.service.ts
│   │   ├── approval.service.ts
│   │   ├── balance.service.ts
│   │   ├── conflict.service.ts
│   │   ├── personnel.service.ts
│   │   ├── notification.service.ts
│   │   ├── audit.service.ts
│   │   └── report.service.ts
│   └── repositories/
│
├── types/
├── config/
└── middleware.ts

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

---

# 26. Service Layer Rule

Do not put business logic directly inside route handlers.

Bad:

```text
POST /api/leaves
  -> 200 lines of balance/conflict/approval logic
```

Better:

```text
Route Handler
    ↓
Validation
    ↓
Permission Check
    ↓
LeaveService.createRequest()
    ↓
ConflictService.check()
    ↓
BalanceService.validate()
    ↓
Transaction
    ↓
Audit + Notification
```

This will make the project much easier to extend.

---

# 27. API Design

Use REST-like resource routes under `/api`.

Standard response shape:

```json
{
  "success": true,
  "data": {},
  "message": "Leave request created successfully"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "LEAVE_CONFLICT",
    "message": "This personnel already has overlapping leave."
  }
}
```

Use consistent HTTP codes:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

---

# 28. Authentication APIs

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/change-password
POST   /api/auth/refresh-session   (optional)
```

## Security

- Argon2id password hashing
- httpOnly secure session cookie
- same-site protection
- CSRF protection where relevant
- session expiry
- session revocation
- rate-limit login
- never return password hashes

For a small internal system, custom credentials + secure session cookies is acceptable and keeps vendor cost low.

---

# 29. User APIs

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id        # preferably soft-disable
POST   /api/users/:id/reset-password
PATCH  /api/users/:id/role
PATCH  /api/users/:id/approval-authority
```

Admin only for management endpoints.

---

# 30. Personnel APIs

```text
GET    /api/personnel
POST   /api/personnel
GET    /api/personnel/:id
PATCH  /api/personnel/:id
DELETE /api/personnel/:id       # soft delete / archive
GET    /api/personnel/:id/leave-history
GET    /api/personnel/:id/balance
GET    /api/personnel/:id/activity
GET    /api/personnel/assigned
```

Query params:

```text
?page=1
&pageSize=20
&search=abc
&unitId=...
&sectionId=...
&status=ACTIVE
&rank=...
```

---

# 31. Unit APIs

```text
GET    /api/units
POST   /api/units
GET    /api/units/:id
PATCH  /api/units/:id
DELETE /api/units/:id
GET    /api/units/:id/personnel
GET    /api/units/:id/sections
```

---

# 32. Section APIs

```text
GET    /api/sections
POST   /api/sections
GET    /api/sections/:id
PATCH  /api/sections/:id
DELETE /api/sections/:id
GET    /api/sections/:id/personnel
```

---

# 33. Moderator Assignment APIs

```text
GET    /api/moderator-assignments
POST   /api/moderator-assignments
PATCH  /api/moderator-assignments/:id
DELETE /api/moderator-assignments/:id
GET    /api/moderators/:id/assignments
```

Rules:

- only Admin manages assignments
- moderator can only read assigned scope
- all leave/personnel queries must enforce scope server-side

---

# 34. Leave Type APIs

```text
GET    /api/leave-types
POST   /api/leave-types
GET    /api/leave-types/:id
PATCH  /api/leave-types/:id
DELETE /api/leave-types/:id
```

---

# 35. Leave Policy APIs

```text
GET    /api/leave-policies
POST   /api/leave-policies
GET    /api/leave-policies/:id
PATCH  /api/leave-policies/:id
DELETE /api/leave-policies/:id
```

---

# 36. Leave Balance APIs

```text
GET    /api/leave-balances/me
GET    /api/leave-balances/personnel/:personnelId
GET    /api/leave-balances
POST   /api/leave-balances/adjust
POST   /api/leave-balances/initialize-year
```

`POST /initialize-year` should be admin-protected and idempotent.

---

# 37. Leave Request APIs

```text
GET    /api/leaves
POST   /api/leaves
GET    /api/leaves/:id
PATCH  /api/leaves/:id
DELETE /api/leaves/:id
POST   /api/leaves/:id/submit
POST   /api/leaves/:id/cancel
POST   /api/leaves/:id/resubmit
GET    /api/leaves/my
GET    /api/leaves/assigned
GET    /api/leaves/calendar
```

Important: `POST /api/leaves` should not directly approve anything.

---

# 38. Leave Review APIs

```text
GET    /api/leaves/:id/reviews
POST   /api/leaves/:id/review
POST   /api/leaves/:id/recommend
POST   /api/leaves/:id/return-for-correction
POST   /api/leaves/:id/reject-at-review
```

Backend must verify moderator assignment before allowing review.

---

# 39. Final Approval APIs

```text
GET    /api/leaves/pending-final-approval
GET    /api/leaves/:id/approval-history
POST   /api/leaves/:id/approve
POST   /api/leaves/:id/reject
POST   /api/leaves/:id/return-for-correction
```

Before approval:

1. authenticate
2. verify active user
3. verify Commander/QM authority OR Admin override permission
4. verify request status
5. verify recommendation rules
6. re-check date conflict
7. re-check balance
8. execute transaction
9. write approval record
10. write audit log
11. create notifications

---

# 40. Return APIs

```text
GET    /api/returns
GET    /api/returns/overdue
GET    /api/returns/:id
POST   /api/returns/:id/mark-returned
PATCH  /api/returns/:id
```

Moderator scope must be enforced.

---

# 41. Event APIs

```text
GET    /api/events
POST   /api/events
GET    /api/events/:id
PATCH  /api/events/:id
DELETE /api/events/:id
```

Audience APIs can be handled in the same create/update request rather than creating many extra endpoints.

---

# 42. Notification APIs

```text
GET    /api/notifications
GET    /api/notifications/unread-count
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
```

Do not allow a user to access another user's notifications.

---

# 43. Report APIs

```text
GET /api/reports/personnel
GET /api/reports/leave
GET /api/reports/pending
GET /api/reports/approved
GET /api/reports/rejected
GET /api/reports/overdue
GET /api/reports/unit-wise
GET /api/reports/individual/:personnelId
```

Export:

```text
GET /api/reports/export/excel
GET /api/reports/export/pdf
```

All exports must reuse the same validated filter object as the report screen.

---

# 44. Audit APIs

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

Admin only.

Filters:

```text
actor
entity
entityId
action
dateFrom
dateTo
```

---

# 45. Settings APIs

```text
GET   /api/settings
GET   /api/settings/:key
PATCH /api/settings/:key
```

Admin only.

Potential settings:

```text
organizationName
fiscalYearStart
leaveDayCalculationMode
allowBackdatedLeave
defaultPageSize
notificationReminderDays
sessionDuration
```

---

# 46. Validation Layer

Use Zod for all incoming request data.

Example modules:

```text
features/leave/schemas/create-leave.schema.ts
features/leave/schemas/review-leave.schema.ts
features/personnel/schemas/personnel.schema.ts
features/events/schemas/event.schema.ts
```

Never trust:

- calculated leave days from client
- role from client
- authority from client
- personnelId from a moderator without scope verification
- approval state from client

---

# 47. Permission Architecture

Centralize permissions.

Example:

```ts
type Permission =
  | 'personnel.read.all'
  | 'personnel.read.assigned'
  | 'personnel.create'
  | 'personnel.update'
  | 'leave.create.self'
  | 'leave.create.onBehalf'
  | 'leave.review.assigned'
  | 'leave.approve.final'
  | 'reports.read'
  | 'audit.read'
  | 'settings.manage';
```

Then create:

```text
hasPermission(user, permission)
assertPermission(user, permission)
assertModeratorScope(user, personnelId)
assertFinalApprovalAuthority(user)
```

Do not spread role string comparisons throughout the codebase.

---

# 48. Scope Enforcement

This is one of the most important security rules.

Moderator should NEVER be able to do:

```text
GET /api/personnel/:any-id
POST /api/leaves/:any-id/review
```

just because they know the URL.

Backend must resolve scope:

```text
Moderator
  ↓
Assignments
  ↓
Allowed Unit/Section IDs
  ↓
Personnel scope
  ↓
Leave scope
```

Example service:

```ts
await assertModeratorCanAccessPersonnel({
  moderatorId,
  personnelId,
});
```

---

# 49. Transaction Rules

Use database transactions for sensitive state changes.

Examples:

### Final approval transaction

```text
BEGIN
  re-check request state
  re-check balance
  re-check conflict
  create approval record
  update request status
  update/reserve balance if policy requires
  create notification
  create audit log
COMMIT
```

### Correction/resubmission

```text
BEGIN
  update request status
  increment correction count
  create review record
  create notification
  create audit log
COMMIT
```

This prevents partial approval states.

---

# 50. Leave Balance Policy Recommendation

For v1, use a clear yearly model:

```text
Balance Year = calendar year
```

Each person gets:

```text
LeaveType + Year + Allocation
```

At submission:

```text
available = allocated + adjustments - used - reserved
```

At approval:

```text
reserve/consume according to policy
```

At cancellation:

```text
release reservation if already reserved
```

At completion:

```text
convert reserved to used
```

This can be simplified for the first release if the department's actual leave policy is simple, but the service layer should keep the abstraction.

---

# 51. Calendar Rules

Calendar event types:

```text
APPROVED_LEAVE
PENDING_LEAVE
RETURN_DATE
ORGANIZATION_EVENT
```

Use color/status badges in UI instead of relying only on color.

Filters:

```text
month
unit
section
leave type
status
```

User calendar should not expose unnecessary private personnel information if policy does not allow it.

---

# 52. UI Component Strategy

Use reusable components.

Example:

```text
<DataTable />
<StatusBadge />
<PermissionGate />
<ConfirmDialog />
<EmptyState />
<LoadingState />
<ErrorState />
<DateRangePicker />
<LeaveBalanceCard />
<ApprovalTimeline />
<AuditTimeline />
<NotificationBell />
<FilterBar />
<ReportExportButtons />
```

Avoid creating giant page components.

---

# 53. Personnel Detail Page

This is the most important profile screen.

```text
┌─────────────────────────────────────────┐
│ Personnel Header                         │
│ Photo | Name | ID | Rank | Unit | Status │
├─────────────────────────────────────────┤
│ Current Status                           │
│ PRESENT / ON LEAVE / OVERDUE             │
├─────────────────────────────────────────┤
│ Leave Balance                             │
│ Allocated | Used | Pending | Remaining   │
├─────────────────────────────────────────┤
│ Service Information                      │
│ Joining | Posting | Supervisor           │
├─────────────────────────────────────────┤
│ Leave History                             │
│ Date | Type | Days | Status | Decision   │
├─────────────────────────────────────────┤
│ Upcoming                                  │
│ Leave | Return | Events                   │
├─────────────────────────────────────────┤
│ Audit / Activity                          │
└─────────────────────────────────────────┘
```

---

# 54. Leave Detail Page

```text
Header
  Request number
  Status
  Applicant

Leave information
  Type
  Start
  End
  Days
  Reason

Balance
  Before
  Requested
  After

Conflict check
  Pass / Conflict

Attachments

Moderator Review Timeline

Final Approval Timeline

Return Information

Actions based on permission
```

---

# 55. Approval Timeline UI

Use a visual timeline:

```text
● Submitted
│
● Moderator Review
│  └─ Recommended
│
● Pending Final Approval
│
├── Commander → Approved
│
└── Quarter Master → Not Required
│
● Final Status → Approved
```

If QM approved instead:

```text
├── Commander → Not Required
└── Quarter Master → Approved
```

This makes the workflow easy for non-technical users to understand.

---

# 56. File Upload Rules

Attachments can include:

- PDF
- JPG/JPEG
- PNG

Suggested v1 limit:

```text
max file size = 5 MB per file
max attachments = 3 per request
```

Validate both client and server.

Store:

```text
fileName
mimeType
fileSize
storageKey/fileUrl
uploadedBy
```

Do not expose raw filesystem paths.

For a cheap deployment, local storage on a VPS can work initially. If using managed hosting/serverless deployment, use object storage or a database-backed storage service.

---

# 57. Background Jobs

Do not build a complex queue for v1.

For 160 users, reminders can be handled with:

- dynamic overdue calculation
- one scheduled daily job if available
- low-cost cron endpoint

Daily tasks:

```text
1. Find tomorrow's leave starts
2. Find tomorrow's returns
3. Find overdue returns
4. Create notifications
5. Mark personnel status as needed
```

Protect the cron endpoint with a secret token.

---

# 58. Security Checklist

### Authentication

- strong password policy
- Argon2id hashing
- secure cookies
- session expiration
- logout/revoke
- login rate limiting

### Authorization

- RBAC server-side
- moderator scope server-side
- approval authority server-side
- Admin-only sensitive endpoints

### Data

- validate all inputs
- parameterized queries through Prisma
- no password hashes in API responses
- no insecure file paths
- audit sensitive changes

### UI

- escape user-generated data
- avoid dangerouslySetInnerHTML
- confirmation for destructive actions
- hide unauthorized actions AND enforce them server-side

### Production

- HTTPS
- environment secrets
- database backups
- error logging
- no secrets in Git

---

# 59. Performance Rules

160 users is a small workload. Do not over-engineer.

Still:

- paginate lists
- index foreign keys
- index leave date ranges/status
- query only required fields
- use server components for data-heavy pages where appropriate
- use client components only for interactive pieces
- debounce global search
- cache static reference data where useful

No microservices required.

No Redis required for v1.

No Kubernetes.

No message broker.

No separate Node/Express backend is required.

---

# 60. Recommended Stack

```text
Next.js App Router
TypeScript
React
Tailwind CSS
shadcn/ui
PostgreSQL
Prisma ORM
Zod
Argon2
Lucide Icons
date-fns
ExcelJS / SheetJS-compatible export library
PDF generation library
```

Prisma is a good fit here because the system is relational and needs typed relations, migrations, and PostgreSQL support. citeturn942487search1turn942487search5

Use the current official package/documentation versions at project initialization rather than blindly pinning old versions.

---

# 61. Data Seeding

Seed initial:

### Roles

Roles are enums, not rows.

### Leave Types

```text
Annual
Casual
Medical
Earned
Special
Emergency
```

### Admin

Create one bootstrap Admin through environment variables/seed script.

### Approval Authorities

Admin can designate:

```text
one active Commander
one active Quarter Master
```

Optionally allow multiple historical records but only one currently active user per authority.

---

# 62. Business Rules To Confirm Before Coding

These are policy questions and should be confirmed with the department before final implementation:

1. Is leave counting inclusive of both start and end dates?
2. Are Fridays/holidays excluded or counted?
3. Can users apply for backdated leave?
4. Can half-day leave exist?
5. Does pending leave reserve balance?
6. Does only approved leave consume balance?
7. Can Commander/QM approve without Moderator recommendation?
8. Can Moderator directly reject?
9. Can Admin override an approval?
10. What happens when a person transfers while a leave is pending?
11. Can an approved leave be cancelled?
12. Can return date be edited after approval?
13. Are attachments mandatory for Medical/Special leave?
14. Can users see names of others currently on leave?
15. How long should audit logs be retained?

Do not silently guess these rules in production.

---

# 63. Recommended V1 Simplifications

Because this is a ৳30,000 / 30-day project, intentionally avoid expensive complexity.

Do NOT build initially:

- mobile app
- SMS gateway
- WhatsApp integration
- biometric attendance
- payroll
- HR salary module
- document OCR
- AI assistant
- multi-organization tenancy
- advanced workflow builder
- custom drag/drop report builder
- complicated approval chains beyond Commander/QM
- real-time WebSocket system

These can become Phase 2.

---

# 64. Phase 2 Ideas

Possible future expansion:

```text
Attendance
Payroll
Duty roster
Document management
ID card management
Training records
Promotion history
Transfer management
Mobile/PWA improvements
Email/SMS
Advanced analytics
Automated scheduled reports
Backup dashboard
```

Keep them out of the ৳30k scope unless specifically approved.

---

# 65. 30-Day Delivery Plan

## Days 1–3

- repository setup
- Next.js App Router
- TypeScript
- Tailwind/shadcn
- PostgreSQL connection
- Prisma schema
- migrations
- seed script
- auth/session base

## Days 4–7

- user management
- personnel CRUD
- unit/section CRUD
- moderator assignment
- role/permission helpers

## Days 8–13

- leave types
- leave policy
- leave balance
- leave application
- attachments
- conflict detection
- validation

## Days 14–17

- moderator review
- recommendation
- correction workflow
- Commander/QM approval
- audit + notifications

## Days 18–20

- calendar
- return tracking
- overdue tracking
- dashboard statistics

## Days 21–22

- events
- audience targeting
- notification center

## Days 23–25

- reports
- filters
- PDF export
- Excel export
- audit views

## Days 26–27

- authorization testing
- edge cases
- security hardening
- UI polish

## Days 28–29

- UAT
- client revisions within approved scope
- data cleanup
- final fixes

## Day 30

- production deployment
- admin bootstrap
- seed production data
- handover
- documentation

---

# 66. Testing Plan

## Authentication

- invalid password
- locked user
- expired session
- logout
- reset password

## RBAC

- User cannot access Admin APIs
- Moderator cannot access unassigned personnel
- User cannot approve own leave
- normal User cannot approve others
- only Commander/QM can final approve

## Leave

- end date before start date
- zero/negative days
- overlap
- no balance
- backdated rule
- attachment-required rule
- duplicate submissions
- correction/resubmission
- cancellation

## Approval

- Commander approval
- QM approval
- second approval attempt
- approval after rejection
- approval after cancellation
- approval after date conflict changed

## Return

- normal return
- overdue
- wrong personnel
- duplicate return action

## Reports

- filters
- pagination
- empty result
- export with filters

---

# 67. API Authorization Matrix

| Action | Admin | Moderator | User | Commander Authority | QM Authority |
|---|---:|---:|---:|---:|---:|
| Manage Users | ✓ | | | | |
| Manage Units | ✓ | | | | |
| Manage Personnel | ✓ | scoped | | | |
| Apply Own Leave | ✓ | ✓ | ✓ | depends on account role | depends on account role |
| Create Leave on Behalf | ✓ | scoped | | | |
| Review Assigned Leave | ✓ | ✓ | | | |
| Recommend | ✓ | ✓ | | | |
| Final Approve | admin override | if also designated authority | | ✓ | ✓ |
| View All Reports | ✓ | | | | |
| Audit Logs | ✓ | | | | |
| System Settings | ✓ | | | | |
| Mark Returned | ✓ | scoped | | | |

The final approval action should check `approvalAuthority`, not only `role`.

---

# 68. Recommended UI Navigation

## Admin sidebar

```text
Dashboard
Personnel
Units & Sections
Users
Leave
  ├─ All Requests
  ├─ Leave Types
  ├─ Leave Rules
  ├─ Balances
  └─ Returns
Calendar
Events
Reports
Audit Logs
Notifications
Settings
```

## Moderator sidebar

```text
Dashboard
My Personnel
Leave
  ├─ Assigned Requests
  ├─ My Leave
  └─ Returns
Calendar
Events
Notifications
Profile
```

If Moderator is Commander/QM-designated, show an additional:

```text
Final Approvals
```

## User sidebar

```text
Dashboard
My Profile
My Leave
Apply Leave
Leave Balance
Calendar
Events
Notifications
```

---

# 69. Dashboard Metrics Queries

Admin metrics:

```text
SELECT count active personnel
SELECT count current leave
SELECT count pending requests
SELECT count pending final approvals
SELECT count overdue returns
SELECT count approved this month
```

Do not fetch all personnel into JavaScript just to calculate counts. Let PostgreSQL aggregate.

---

# 70. Reporting Query Strategy

Create reusable filter input:

```ts
type LeaveReportFilters = {
  unitId?: string;
  sectionId?: string;
  leaveTypeId?: string;
  status?: LeaveRequestStatus;
  startDate?: Date;
  endDate?: Date;
  personnelId?: string;
};
```

Then:

```text
LeaveReportService.query(filters)
```

Use the same service for:

- on-screen table
- Excel export
- PDF export

This prevents report data mismatch.

---

# 71. Audit Event Naming Convention

Use consistent event names:

```text
AUTH_LOGIN
AUTH_LOGOUT
AUTH_PASSWORD_RESET
USER_CREATED
USER_UPDATED
USER_DISABLED
ROLE_CHANGED
AUTHORITY_CHANGED
PERSONNEL_CREATED
PERSONNEL_UPDATED
PERSONNEL_TRANSFERRED
LEAVE_CREATED
LEAVE_SUBMITTED
LEAVE_REVIEWED
LEAVE_RECOMMENDED
LEAVE_RETURNED
LEAVE_APPROVED
LEAVE_REJECTED
LEAVE_CANCELLED
LEAVE_RESUBMITTED
BALANCE_ADJUSTED
RETURN_MARKED
EVENT_CREATED
EVENT_UPDATED
EVENT_DELETED
SETTING_UPDATED
```

---

# 72. Error Handling

Central error mapping:

```text
ValidationError → 422
UnauthorizedError → 401
ForbiddenError → 403
NotFoundError → 404
ConflictError → 409
BusinessRuleError → 422
UnknownError → 500
```

Never return stack traces in production.

---

# 73. Environment Variables

Example:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SESSION_SECRET="..."
APP_URL="https://example.com"
CRON_SECRET="..."
FILE_STORAGE_URL="..."
SMTP_HOST="..."
SMTP_USER="..."
SMTP_PASSWORD="..."
```

Only include SMTP/storage variables if that service is actually used.

---

# 74. Deployment Options

## Budget Option

```text
Next.js      → Vercel / low-cost VPS
PostgreSQL   → Supabase / Neon / VPS PostgreSQL
Storage      → Supabase Storage / VPS
Domain       → Client
```

Because the expected population is only ~160 users, the infrastructure requirement is small. The main concern is plan policy, backup, and operational reliability—not raw traffic capacity.

## Self-hosted Option

```text
Ubuntu VPS
Nginx
Next.js
PostgreSQL
PM2 or Docker
Cloudflare
Daily database backup
```

Choose based on client budget and deployment policy.

---

# 75. Production Backup

Minimum:

```text
Daily PostgreSQL backup
Weekly backup retention
At least one off-server copy
```

Never store all backups only on the same VPS.

For the first budget release, automated database backup is more valuable than sophisticated monitoring.

---

# 76. Definition of Done

The project is complete when:

- all three roles can login
- personnel data can be managed
- moderator scope works
- user can apply leave
- balance is calculated
- overlapping leave is blocked
- moderator can review/recommend
- Commander can approve
- Quarter Master can approve
- either authority is sufficient
- approval is audited
- notifications appear
- calendar displays leave/events
- return can be marked
- overdue is detected
- admin can run reports
- PDF/Excel export works
- audit logs exist
- unauthorized APIs return 403
- database migrations are committed
- production environment is configured
- initial admin is created

---

# 77. Handover Checklist

Deliver:

```text
Source code
Database schema
Prisma migrations
Seed script
.env.example
README
Deployment instructions
Admin credentials delivered securely
Basic user guide
```

Never place real production passwords inside Git.

---

# 78. README Quick Start

```bash
npm install

# create environment file
cp .env.example .env

# run migrations
npx prisma migrate dev

# seed database
npx prisma db seed

# start development
npm run dev
```

Production:

```bash
npm run build
npm run start
```

Use the exact current package-manager commands generated by the installed Prisma/Next.js versions during implementation.

---

# 79. Coding Conventions

Use:

- TypeScript strict mode
- async/await
- small services
- explicit domain types
- Zod validation
- repository/service separation where useful
- server-side authorization
- reusable UI components
- meaningful names
- no giant files

Avoid:

- `any`
- duplicated business logic
- role checks scattered across components
- database calls directly inside dozens of UI components
- trusting hidden UI buttons as authorization
- hardcoded leave rules

---

# 80. Recommended Development Order

Build in this exact dependency order:

```text
1. DB schema
2. Prisma migrations
3. Auth/session
4. RBAC helpers
5. Unit/Section
6. Personnel
7. Leave Types/Rules
8. Leave Balance
9. Leave Request
10. Conflict Detection
11. Moderator Review
12. Final Approval
13. Return Tracking
14. Notifications
15. Calendar
16. Events
17. Reports
18. Audit UI
19. Dashboard polish
20. Testing + Deployment
```

Do not start with charts or visual dashboards before the leave workflow is correct.

---

# 81. Most Important Business Workflow

The complete workflow should behave like this:

```text
                    ┌──────────────┐
                    │     USER     │
                    └──────┬───────┘
                           │
                      Apply Leave
                           │
                           ▼
                  ┌─────────────────┐
                  │ Balance Check   │
                  │ Conflict Check  │
                  └────────┬────────┘
                           │
                           ▼
                    PENDING REVIEW
                           │
                           ▼
                  ┌─────────────────┐
                  │   MODERATOR     │
                  │ Review Assigned │
                  │    Personnel    │
                  └────────┬────────┘
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
           Return      Recommend       Reject
              │            │
              │            ▼
              │     PENDING FINAL
              │        APPROVAL
              │            │
              │      ┌─────┴─────┐
              │      │           │
              │      ▼           ▼
              │  COMMANDER   QUARTER MASTER
              │      │           │
              │      └─────┬─────┘
              │            │
              │        APPROVED
              │            │
              │            ▼
              │       ON LEAVE
              │            │
              │            ▼
              │     EXPECTED RETURN
              │            │
              │       ┌────┴────┐
              │       │         │
              │    RETURNED   OVERDUE
              │
              └── Resubmit
```

This workflow should be the backbone of the whole application.

---

# 82. Practical Scope for ৳30k

The system should feel polished but the engineering must stay disciplined.

### Must-have

```text
✓ Auth
✓ 3 roles
✓ Commander/QM authority
✓ Personnel
✓ Unit/Section
✓ Leave types
✓ Leave application
✓ Balance
✓ Conflict detection
✓ Moderator review
✓ Final approval
✓ Correction workflow
✓ Calendar
✓ Events
✓ Notifications
✓ Return tracking
✓ Overdue tracking
✓ Audit logs
✓ Reports
✓ Excel/PDF
```

### Nice-to-have only if time remains

```text
○ advanced charts
○ email reminders
○ advanced export styling
○ richer analytics
○ drag/drop calendar
```

### Phase 2

```text
○ SMS
○ biometric
○ attendance
○ payroll
○ mobile app
```

---

# 83. Final Technical Direction

## Architecture

```text
                 Browser
                    |
                    v
          Next.js App Router
          /              \
     Server UI         API Routes
          \              /
           \            /
             Domain Services
                    |
                    v
                 Prisma
                    |
                    v
               PostgreSQL
```

## Core services

```text
AuthService
PermissionService
PersonnelService
UnitService
LeaveTypeService
LeavePolicyService
LeaveBalanceService
LeaveConflictService
LeaveService
LeaveReviewService
LeaveApprovalService
LeaveReturnService
NotificationService
EventService
ReportService
AuditService
```

This is enough architecture for a small departmental system without unnecessary microservices.

---

# 84. Final Project Rules

1. **Only 3 application roles:** Admin, Moderator, User.
2. Commander and Quarter Master are **approval authorities**, not roles.
3. Moderator access is always scoped by unit/section assignment.
4. Final approval can come from either Commander OR Quarter Master.
5. All sensitive actions generate audit records.
6. Client-side UI restrictions are not security; server-side authorization is mandatory.
7. Leave balance is calculated by a dedicated service.
8. Leave overlap is checked on the backend.
9. Every approval is transactional.
10. Reports and exports use the same filter/service layer.
11. Hosting/domain/paid third-party service costs are outside the ৳30,000 development fee.
12. New features outside the approved scope become separate work.
13. Development commitment is 30 days.
14. Build the first version as a modular Next.js monolith, not microservices.
15. Keep the implementation simple enough to finish, test, deploy, and maintain within the agreed budget.

---

# 85. Final Checklist Before Production

```text
[ ] Production database created
[ ] Migrations applied
[ ] Seed data reviewed
[ ] Commander assigned
[ ] Quarter Master assigned
[ ] Moderator assignments verified
[ ] Leave types configured
[ ] Leave policies configured
[ ] Balance initialized
[ ] Admin account secured
[ ] Password reset tested
[ ] HTTPS enabled
[ ] Database backup configured
[ ] File upload restrictions tested
[ ] RBAC tested
[ ] Moderator scope tested
[ ] Commander approval tested
[ ] Quarter Master approval tested
[ ] Conflict detection tested
[ ] Return/overdue tested
[ ] Notification tested
[ ] Reports tested
[ ] Excel/PDF tested
[ ] Audit log tested
[ ] UAT completed
[ ] Client handover completed
```

---

## Source Documentation Used for Technical Direction

- Next.js official documentation: App Router is the newer router and is intended for modern React features/Server Components. https://nextjs.org/docs
- Prisma official documentation: relational models and foreign-key-backed relations for PostgreSQL. https://docs.prisma.io/docs
- Prisma PostgreSQL quickstart: modern Prisma project structure and PostgreSQL configuration. https://www.prisma.io/docs/prisma-orm/quickstart/postgresql

