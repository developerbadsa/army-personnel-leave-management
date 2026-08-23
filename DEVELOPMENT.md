# 📋 Army Personnel & Leave Management — Development Progress Tracker

> **Project Name:** Army Personnel & Leave Management System  
> **Target Population:** ~155–160 Personnel  
> **Tech Stack:** Next.js App Router (TypeScript), Tailwind CSS, Prisma 7, PostgreSQL  
> **Development Commitment:** 30 Days | ৳30,000  

---

## 🎯 System Roles & Authorities

- **Roles (RBAC):** `ADMIN`, `MODERATOR`, `USER`
- **Approval Authorities:** `NONE`, `COMMANDER`, `QUARTER_MASTER` (Either Commander OR QM can give final approval)
- **Moderator Scope:** Assigned dynamically to Units/Sections.

---

## 📊 Overall Milestone Status

| Phase | Milestone / Domain | Target Days | Status | Notes |
|:---:|---|:---:|:---:|---|
| **Phase 1** | Project Setup & Prisma 7 PostgreSQL Schema | Days 1–3 | 🟢 **COMPLETED** | DB Synced & Seeded (Commit `8557381`) |
| **Phase 2** | Auth, RBAC & Core API Layer | Days 1–3 | 🟢 **COMPLETED** | JWT Session, Auth Guard, Full API Suite |
| **Phase 3** | Organization & Personnel APIs | Days 4–7 | 🟢 **COMPLETED** | Units, Sections, Personnel, Assignments |
| **Phase 4** | Leave Engine, Balances & Applications | Days 8–13 | 🟢 **COMPLETED** | Conflict check, Ledger balance calculation |
| **Phase 5** | Moderator Review & Final Approvals | Days 14–17 | 🟢 **COMPLETED** | Commander/QM transaction approval |
| **Phase 6** | Returns, Overdue, Calendar & Events | Days 18–22 | 🟢 **COMPLETED** | Return tracking, Audience-targeted events |
| **Phase 7** | Reports, Analytics & Audit Logs | Days 23–25 | 🟢 **COMPLETED** | Filtered reporting, Dashboard metrics |
| **Phase 8** | Frontend UI (shadcn/ui & Tailwind) | Days 26–27 | 🟡 **NEXT UP** | Responsive role-based dashboards & forms |
| **Phase 9** | Testing, Edge-Cases & Hardening | Days 28–29 | ⚪ Pending | Dual approval, scope security test |
| **Phase 10**| Production Deployment & Handover | Day 30 | ⚪ Pending | Final seed, UAT handover |

---

## 🛠️ API Endpoints Inventory & Progress

### 1. Authentication & Session (`/api/auth/*`)
- [x] `POST /api/auth/login` — Email/password login with JWT session cookie
- [x] `GET /api/auth/me` — Current user profile, role, authority, personnel details
- [x] `POST /api/auth/logout` — Clear session cookie
- [x] `POST /api/auth/change-password` — Secure password update

### 2. Organization & Structure (`/api/units/*`, `/api/sections/*`)
- [x] `GET /api/units` — List all units (with section count)
- [x] `POST /api/units` — Create unit (Admin only)
- [x] `GET, PUT, DELETE /api/units/[id]` — Unit details, update, delete/deactivate
- [x] `GET, POST /api/sections` — List & create sections under units
- [x] `GET, PUT, DELETE /api/sections/[id]` — Section details, update, delete

### 3. Users & Moderator Assignments (`/api/users/*`, `/api/moderators/*`)
- [x] `GET /api/users` — List users with role/authority filters (Admin only)
- [x] `POST /api/users` — Create user (Admin only)
- [x] `GET, PUT /api/users/[id]` — User details & role/authority update
- [x] `GET, POST /api/moderators/assignments` — List & assign moderators to units/sections
- [x] `DELETE /api/moderators/assignments/[id]` — Revoke moderator assignment

### 4. Personnel Records (`/api/personnel/*`)
- [x] `GET /api/personnel` — List personnel (Admin sees all, Moderator sees assigned scope)
- [x] `POST /api/personnel` — Create personnel record (Admin only)
- [x] `GET /api/personnel/[id]` — Personnel profile details
- [x] `PUT, DELETE /api/personnel/[id]` — Update or deactivate personnel

### 5. Leave Types, Policies & Balances (`/api/leaves/*`)
- [x] `GET, POST /api/leaves/types` — Manage leave types
- [x] `PUT, DELETE /api/leaves/types/[id]` — Update / deactivate leave type
- [x] `GET /api/leaves/balances` — Retrieve leave balances by personnel & year
- [x] `POST /api/leaves/balances/adjust` — Admin manual balance adjustment with audit

### 6. Leave Applications & Workflow (`/api/leaves/*`)
- [x] `POST /api/leaves/apply` — Submit leave request (with date overlap check & balance check)
- [x] `GET /api/leaves` — List leave requests (filtered by Admin / Moderator / User)
- [x] `GET /api/leaves/[id]` — Full leave request details, review history, approvals
- [x] `POST /api/leaves/[id]/review` — Moderator review (Recommend / Return / Reject)
- [x] `POST /api/leaves/[id]/approve` — Commander or Quarter Master Final Approval

### 7. Returns & Overdue Tracking (`/api/leaves/returns/*`)
- [x] `GET /api/leaves/returns` — List returns and overdue records
- [x] `POST /api/leaves/returns/[id]` — Mark personnel returned from leave

### 8. Events & Calendar (`/api/events/*`, `/api/calendar/*`)
- [x] `GET, POST /api/events` — Events list (audience filtered) and create (Admin only)
- [x] `GET /api/calendar` — Unified calendar events & approved leaves

### 9. Notifications, Reports & Audit Logs (`/api/*`)
- [x] `GET, PUT /api/notifications` — In-app notification list and mark-read
- [x] `GET /api/reports/leave` — Leave report with date range / unit filters
- [x] `GET /api/reports/personnel` — Personnel status report
- [x] `GET /api/audit-logs` — System audit logs (Admin only)
- [x] `GET /api/dashboard/stats` — Role-based summary cards & metrics

## 🎨 UI/UX Design System & Standards

- **Strict 4px Radius Rule:** All buttons, cards, inputs, textareas, modals, badges, and tables follow `rounded-[4px]` (`--radius: 4px`) for a crisp, disciplined military/executive look.
- **Premium Icon Standard:** `lucide-react` only (no cheap, mismatched icon sets).
- **Prebuilt & Reusable Architecture:** Clean, headless-compatible components with zero ad-hoc styling or hardcoding:
  - `components/ui/button.tsx` — CVA variants (`default`, `destructive`, `success`, `outline`, `secondary`, `ghost`, `link`)
  - `components/ui/input.tsx` & `components/ui/textarea.tsx` — 4px focus ring with error messaging
  - `components/ui/card.tsx` — Modular Header, Title, Description, Content, Footer
  - `components/ui/badge.tsx` — Semantic badges with 4px radius
  - `components/ui/status-badge.tsx` — Centralized status mapper with Lucide icons for all 11 lifecycle states
  - `components/ui/stat-card.tsx` — Reusable KPI card with Lucide icons
  - `components/ui/table.tsx` — Standardized data table with 4px border
  - `components/ui/modal.tsx` — Clean dialog modal with backdrop blur
  - `lib/utils.ts` — `cn` class merger & date/time formatters

---

## 🔒 Security & Architecture Rules Followed

1. **Authentication:** Stateless signed JWT stored in secure `httpOnly`, `sameSite=lax` cookie (`army_session`).
2. **Server-Side Authorization:** Every Route Handler checks token, role (`ADMIN`, `MODERATOR`, `USER`), and `approvalAuthority` before querying or mutating data.
3. **Scoped Queries:** Moderators can only query/view personnel and leave applications belonging to their assigned Units/Sections.
4. **Transactional Approvals:** Final approvals (Commander / QM) use atomic state validation (`Prisma.$transaction`) to prevent dual approval race conditions.
5. **Ledger Balance Engine:** Balances are validated against allocated + adjustments - used - reserved days.
6. **Audit Trail:** Critical actions (approval, return, user changes, balance adjustments) create immutable records in `AuditLog`.
