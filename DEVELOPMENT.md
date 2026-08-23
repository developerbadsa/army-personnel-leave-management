# 📅 Production Delivery Plan — Day-wise Breakdown

> **Project:** Army Personnel & Leave Management System
> **Budget:** ৳30,000 | **Timeline:** 30 Days
> **Status (Day 0):** All 91 API endpoints ✅ complete, Prisma schema ✅, Auth/RBAC libs ✅

---

## 🔢 Phase Overview

| Phase | Days | Focus Area | Status |
|-------|------|------------|--------|
| Phase 1 | 1-2 | Infrastructure & Setup | ⬜ Pending |
| Phase 2 | 3-5 | Auth & Core Layout | ⬜ Pending |
| Phase 3 | 6-9 | Personnel & Organization | ⬜ Pending |
| Phase 4 | 10-15 | Leave Workflow (Core) | ⬜ Pending |
| Phase 5 | 16-17 | Calendar & Events | ⬜ Pending |
| Phase 6 | 18-20 | Reports & Export | ⬜ Pending |
| Phase 7 | 21-22 | Notifications & Audit | ⬜ Pending |
| Phase 8 | 23-24 | Dashboard | ⬜ Pending |
| Phase 9 | 25-27 | Polish & Testing | ⬜ Pending |
| Phase 10 | 28-30 | Deployment & Handover | ⬜ Pending |

---

## Phase 1 — Infrastructure & Setup (Day 1-2)

### Day 1
- [ ] Run `prisma migrate dev` — create initial migration
- [ ] Run `prisma db seed` — seed leave types, units, sections, admin user
- [ ] Verify admin can login via API (`POST /api/auth/login`)
- [ ] Install frontend dependencies:
  - `shadcn/ui` components (DataTable, Dialog, Form, Badge, Card, etc.)
  - `date-fns` for date formatting
  - `lucide-react` for icons
  - `recharts` for dashboard charts
  - `exceljs` for Excel export
  - `@react-pdf/renderer` or `jspdf` for PDF export
- [ ] Setup shadcn/ui theme (colors, fonts)
- [ ] Create shared UI components:
  - `<LoadingSpinner />`
  - `<EmptyState />`
  - `<ErrorState />`
  - `<StatusBadge />`
  - `<ConfirmDialog />`
  - `<PageHeader />`

### Day 2
- [ ] Create Next.js middleware (`middleware.ts`) for:
  - Session cookie validation on protected routes
  - Redirect unauthenticated users to `/login`
  - Redirect authenticated users away from `/login`
- [ ] Create API client helper (`lib/api.ts`):
  - `fetchApi()` wrapper with error handling
  - Automatic cookie inclusion
  - Standard response parsing
- [ ] Create auth context/store (`features/auth/`):
  - `AuthProvider` — stores current user session
  - `useAuth()` hook — login, logout, user data
- [ ] Create layout components:
  - `<AppSidebar />` — role-based navigation
  - `<AppHeader />` — user menu, notifications bell
  - `<DashboardLayout />` — sidebar + header + content

---

## Phase 2 — Auth & Core Layout (Day 3-5)

### Day 3
- [ ] **Login Page** (`/login`)
  - Email + password form with Zod validation
  - Error handling (invalid credentials, disabled account)
  - Redirect to `/dashboard` on success
  - "Forgot Password" link

### Day 4
- [ ] **Forgot Password Page** (`/forgot-password`)
  - Email input form
  - Success confirmation message
- [ ] **Reset Password Page** (`/reset-password`)
  - Token validation from URL params
  - New password + confirm password form
  - Success redirect to login
- [ ] **Change Password** (in profile/settings)
  - Current password + new password form

### Day 5
- [ ] **Main Dashboard Layout** — finalize sidebar navigation:
  - **Admin:** Dashboard, Personnel, Units & Sections, Users, Leave (sub-menu), Calendar, Events, Reports, Audit Logs, Notifications, Settings
  - **Moderator:** Dashboard, My Personnel, Leave (sub-menu), Calendar, Events, Notifications, Profile
  - **User:** Dashboard, My Profile, My Leave, Apply Leave, Leave Balance, Calendar, Events, Notifications
- [ ] Role-based menu visibility (hide/show items based on role)
- [ ] Responsive sidebar (mobile hamburger menu)

---

## Phase 3 — Personnel & Organization (Day 6-9)

### Day 6
- [ ] **Personnel List Page** (`/personnel`)
  - DataTable with server-side pagination
  - Search bar (name, service ID, rank, phone)
  - Filters: Unit, Section, Status
  - Status badges (Active, On Leave, Inactive, etc.)
  - "Add Personnel" button (Admin only)

### Day 7
- [ ] **Personnel Form** (Create/Edit)
  - All fields: serviceId, fullName, rank, phone, email, bloodGroup, unit, section, supervisor, dates
  - Unit → Section cascading dropdown
  - Link user account (optional)
  - Form validation with Zod
- [ ] **Personnel Profile Page** (`/personnel/[id]`)
  - Header: Photo, Name, ID, Rank, Unit, Status
  - Current status card (Present / On Leave / Overdue)
  - Leave balance summary cards
  - Service info section
  - Leave history table (recent 10)
  - Upcoming events

### Day 8
- [ ] **Units Management** (`/organization/units`)
  - Unit list with section/personnel counts
  - Create/Edit unit dialog
  - Deactivate/Delete with confirmation
- [ ] **Sections Management** (`/organization/sections`)
  - Section list (filterable by unit)
  - Create/Edit section dialog
  - Cascading unit dropdown

### Day 9
- [ ] **User Management** (`/users`)
  - User list with role badges
  - Create user form (email, password, role)
  - Edit user: change role, approval authority, disable
  - Admin reset password action
  - Moderator assignment management
- [ ] **Moderator Assignment UI**
  - Assign moderator to unit/section
  - View existing assignments
  - Revoke assignment

---

## Phase 4 — Leave Workflow (Day 10-15) ⭐ Core Feature

### Day 10
- [ ] **Leave Types Management** (`/leaves/types`)
  - List all leave types with properties
  - Create/Edit leave type form
  - Toggle active/inactive
- [ ] **Leave Policies Management** (`/leaves/rules`)
  - List policies grouped by leave type
  - Create/Edit policy form
  - Effective date management

### Day 11
- [ ] **Leave Balance View** (`/leaves/balances`)
  - Balance cards per leave type (Allocated | Used | Pending | Remaining)
  - Year selector
  - Admin: view any personnel's balance
  - Admin: adjust balance with reason
  - Admin: bulk initialize year button

### Day 12
- [ ] **Apply Leave Form** (`/leaves/apply`)
  - Leave type dropdown
  - Date range picker (start → end)
  - Auto-calculate total days
  - Reason textarea
  - Contact during leave, address, emergency contact
  - Attachment upload (if required by leave type)
  - Conflict check warning
  - Balance preview before submit
- [ ] **My Leave List** (`/leaves/my`)
  - Personal leave requests table
  - Status filter tabs (All, Pending, Approved, Rejected)
  - Click to view details

### Day 13
- [ ] **Leave Detail Page** (`/leaves/[id]`)
  - Full request info
  - Balance before/after
  - Conflict status
  - Attachment viewer
  - **Approval Timeline** (visual step-by-step)
  - Action buttons based on role:
    - User: Cancel, Resubmit (if corrected)
    - Moderator: Review, Recommend, Return, Reject
    - Commander/QM: Approve, Reject, Return

### Day 14
- [ ] **Moderator Review Panel** (`/leaves/assigned`)
  - Assigned leave requests list
  - Review dialog: decision dropdown + remarks
  - Quick balance check modal
  - Recommend / Return for Correction / Reject actions

### Day 15
- [ ] **Final Approval Panel** (for Commander/QM users)
  - Pending final approval list
  - Full detail view before decision
  - Approve / Reject / Return actions
  - Approval record with authority tag
- [ ] **Leave Returns Management** (`/leaves/returns`)
  - Return list with overdue highlighting
  - Mark returned action
  - Overdue days counter

---

## Phase 5 — Calendar & Events (Day 16-17)

### Day 16
- [ ] **Leave Calendar** (`/calendar`)
  - Monthly calendar view
  - Leave entries (colored by type)
  - Event entries
  - Click entry for details popup
  - Month/week navigation
  - Filters: unit, leave type, status

### Day 17
- [ ] **Events Management** (`/events`)
  - Event list view
  - Create/Edit event form:
    - Title, type, dates, location
    - Audience targeting (All, Unit, Section, Personnel)
  - Event detail page
  - Delete with confirmation

---

## Phase 6 — Reports & Export (Day 18-20)

### Day 18
- [ ] **Reports Hub** (`/reports`)
  - Report type cards: Leave, Personnel, Pending, Approved, Overdue, Unit-wise
  - Quick navigation to each report
- [ ] **Leave Report Page** (`/reports/leave`)
  - Filter bar: unit, section, type, status, date range
  - Summary cards (total, approved days, status breakdown)
  - Results table
  - Export buttons (Excel, PDF)

### Day 19
- [ ] **Personnel Report** (`/reports/personnel`)
  - Summary: total, by status, by rank
  - Full personnel table with filters
  - Export buttons
- [ ] **Pending / Approved / Overdue Reports**
  - Dedicated pages with focused data
  - Same filter + export pattern
- [ ] **Unit-wise Report** (`/reports/unit-wise`)
  - Unit breakdown cards
  - Leave days per unit comparison

### Day 20
- [ ] **Individual Report** (`/reports/individual/[personnelId]`)
  - Full leave statement for one person
  - Year selector
  - Balance + all leave requests
  - Print-friendly layout
- [ ] **Excel Export** — integrate `exceljs`:
  - Apply same filters as on-screen
  - Proper headers, formatted columns
  - Auto-download .xlsx file
- [ ] **PDF Export** — integrate PDF library:
  - Formatted report with header/footer
  - Organization name, date, filters applied
  - Print-optimized layout

---

## Phase 7 — Notifications & Audit (Day 21-22)

### Day 21
- [ ] **Notification Center** (`/notifications`)
  - Notification list with read/unread status
  - Click to mark as read
  - "Mark all as read" button
  - Notification type icons/badges
  - Link to related entity (leave request, etc.)
- [ ] **Notification Bell** (in header)
  - Unread count badge
  - Dropdown preview (last 5)
  - "View all" link

### Day 22
- [ ] **Audit Log Page** (`/audit-logs`)
  - Admin only
  - Filterable table: actor, action, entity, date range
  - Pagination
  - Detail modal: old/new values, actor info, IP, user agent
- [ ] **Settings Page** (`/settings`)
  - Admin only
  - Display all system settings
  - Edit setting value (JSON editor or form-based)
  - Confirmation before save

---

## Phase 8 — Dashboard (Day 23-24)

### Day 23
- [ ] **Admin Dashboard**
  - Stat cards: Total Personnel, Active, On Leave, Pending Review, Awaiting Final Approval, Overdue Returns, Upcoming Events
  - Monthly leave trend chart (recharts)
  - Leave type distribution pie chart
  - Pending requests table (recent 5)
  - Currently absent personnel table
  - Overdue returns alert table

### Day 24
- [ ] **Moderator Dashboard**
  - Assigned personnel count
  - Pending reviews count
  - Recommended awaiting final approval count
  - Assigned pending requests table
  - Upcoming returns
- [ ] **User Dashboard**
  - Current status card
  - Leave balance cards
  - Recent leave requests
  - Next return date
  - Recent notifications
  - Upcoming events

---

## Phase 9 — Polish & Testing (Day 25-27)

### Day 25
- [ ] **Authorization Testing**
  - Test all 3 roles on all endpoints
  - Verify moderator scope enforcement
  - Verify Commander/QM authority checks
  - Ensure User cannot access admin/moderator endpoints
- [ ] **Leave Workflow E2E Testing**
  - Full flow: Apply → Review → Recommend → Approve → Return
  - Conflict detection verification
  - Balance reservation/consumption verification
  - Correction/resubmission flow
  - Cancellation flow

### Day 26
- [ ] **Edge Cases**
  - Back-to-back leave requests
  - Half-day leave (if applicable)
  - Year boundary (Dec→Jan)
  - Concurrent approvals (race condition)
  - Empty states (no data yet)
  - Loading states
  - Error states (network failure)

### Day 27
- [ ] **UI Polish**
  - Responsive design testing (mobile, tablet, desktop)
  - Loading skeletons for tables
  - Toast notifications for actions
  - Confirmation dialogs for destructive actions
  - Form error highlighting
  - Keyboard navigation
  - Accessibility basics (alt text, aria labels)

---

## Phase 10 — Deployment & Handover (Day 28-30)

### Day 28
- [ ] **Production Build**
  - `npm run build` — fix any build errors
  - Environment variables setup (`.env.production`)
  - Database connection string
  - SESSION_SECRET
  - CRON_SECRET
- [ ] **Database Setup**
  - Production PostgreSQL (Supabase / Neon / VPS)
  - Run migrations: `npx prisma migrate deploy`
  - Seed production data

### Day 29
- [ ] **Deploy Application**
  - Option A: Vercel (easiest, free tier available)
  - Option B: VPS (Ubuntu + Nginx + PM2)
  - Configure domain (if provided by client)
  - Test production login
  - Test all critical flows on production
- [ ] **Post-deployment verification**
  - Admin login ✓
  - Create personnel ✓
  - Apply leave ✓
  - Review + Approve ✓
  - Calendar ✓
  - Reports ✓

### Day 30
- [ ] **Handover**
  - Admin credentials delivery (secure channel)
  - Basic user guide / documentation
  - `.env.example` file
  - README.md with setup instructions
  - Deployment instructions
  - Database backup instructions
  - Walkthrough session with client (if remote)
- [ ] **Backup Setup**
  - Daily PostgreSQL backup cron (if VPS)
  - Or enable auto-backup (Supabase/Neon)

---

## 📊 Progress Tracker

| Day | Completed | Notes |
|-----|-----------|-------|
| 1 | — | — |
| 2 | — | — |
| 3 | — | — |
| 4 | — | — |
| 5 | — | — |
| 6 | — | — |
| 7 | — | — |
| 8 | — | — |
| 9 | — | — |
| 10 | — | — |
| 11 | — | — |
| 12 | — | — |
| 13 | — | — |
| 14 | — | — |
| 15 | — | — |
| 16 | — | — |
| 17 | — | — |
| 18 | — | — |
| 19 | — | — |
| 20 | — | — |
| 21 | — | — |
| 22 | — | — |
| 23 | — | — |
| 24 | — | — |
| 25 | — | — |
| 26 | — | — |
| 27 | — | — |
| 28 | — | — |
| 29 | — | — |
| 30 | — | — |

---

## 📦 NPM Packages Needed

```bash
# UI Components
npx shadcn@latest init
npx shadcn@latest add button card dialog input select table badge textarea tabs dropdown-menu separator sheet toast avatar

# Utilities
npm install date-fns
npm install lucide-react

# Charts
npm install recharts

# Export
npm install exceljs          # Excel export
npm install jspdf jspdf-autotable  # PDF export

# Forms
npm install react-hook-form @hookform/resolvers zod
```

---

## ⚡ Quick Reference — What's Done vs What's Left

### ✅ DONE (Backend)
- [x] 91 API endpoints (62 route files)
- [x] Prisma schema (20 models)
- [x] Auth system (JWT + cookies)
- [x] RBAC (3 roles + approval authority)
- [x] Audit logging
- [x] Notification system
- [x] Seed script

### ✅ DONE (Frontend)
- [x] Middleware (route protection)
- [x] 29 frontend pages
- [x] 17 reusable components
- [x] 6 report pages + CSV export
- [x] Dashboard (3 role variants with charts)
- [x] Calendar view (monthly grid)
- [x] Auth flow (login, forgot/reset password)
- [x] Personnel list + detail + assigned view
- [x] Units & Sections management
- [x] User management (create, role, authority, disable, reset password)
- [x] Leave types management
- [x] Leave balances view
- [x] Apply leave form
- [x] Leave detail with approval timeline
- [x] My leave requests
- [x] Leave returns tracking
- [x] Events list + create
- [x] Notifications center with mark-read
- [x] Audit logs viewer
- [x] Settings management
- [x] Profile page
- [x] Auth provider + API client lib
- [x] Typecheck: ✅ ZERO errors

### ⬜ LEFT (Polish + Deploy)
- [ ] PDF export integration
- [ ] File upload for leave attachments
- [ ] Advanced charts (recharts)
- [ ] Leave policies management page
- [ ] Personnel create/edit form page
- [ ] Individual report page
- [ ] Responsive design testing
- [ ] Production build + deploy
- [ ] Testing + handover
