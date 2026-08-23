# 📐 Universal UI/UX Design System & Standards Guide

> **Standard Name:** Executive Military-Grade Minimalist UI Standard  
> **Core Philosophy:** Human-Crafted, Ultra-Simple, Glanceable, Zero-Clutter  
> **Applicability:** Standalone design specification ready for any web/mobile project.

---

## 🎯 1. Core Design Philosophy

1. **Human-Made & Intuitive:** Every screen must feel handcrafted by a thoughtful engineer—simple, clean, and immediately understandable without any manual or training.
2. **Minimal Text, Maximum Clarity:** Eliminate long paragraphs, redundant labels, and cognitive clutter. Use big glanceable numbers, standardized visual pills, and clean action buttons.
3. **Speed & Efficiency:** Every primary user action (applying for leave, approving a request, finding a record) must be achievable in 1-2 clicks.
4. **Discipline & Precision:** Clean 1-pixel borders, sharp consistent geometry, high contrast, and structured grid alignment.

---

## 📏 2. Universal 4px Border-Radius Rule (`rounded-[4px]`)

> [!IMPORTANT]
> **Strict Rule:** Every interactive or container element **MUST** use exactly `border-radius: 4px` (`rounded-[4px]` / `rounded-sm`).  
> Bubbly or oversized border radii (`rounded-xl`, `rounded-2xl`, `rounded-full` for cards/buttons) are **strictly forbidden**.

### Radius Mapping Table:
| Element Type | Border Radius Standard | Tailwind Class | Reason |
|---|---|---|---|
| **Buttons** | `4px` | `rounded-[4px]` | Crisp, executive, tactical look |
| **Input Fields & Textareas** | `4px` | `rounded-[4px]` | Clean, stable form alignment |
| **Cards & Containers** | `4px` | `rounded-[4px]` | Solid structural framing |
| **Status Badges & Pills** | `4px` | `rounded-[4px]` | Uniformity with buttons |
| **Data Tables** | `4px` | `rounded-[4px]` | Sharp tabular border |
| **Modals & Dialogs** | `4px` | `rounded-[4px]` | Consistent floating window |
| **Dropdowns & Select Menus**| `4px` | `rounded-[4px]` | Seamless popover matching |

---

## 🎨 3. Centralized Color Palette & Design Tokens

All colors must be derived from a centralized token palette. Never use ad-hoc random hex values inside page files.

### 3.1 Base Neutral Palette (Slate & Neutral Surface)
- **Primary / Brand:** `Slate-900` (`#0f172a`) — Headers, primary action buttons, active navigation states.
- **Surface / Background:** `Slate-50` (`#f8fafc`) — Main application background.
- **Card Background:** `White` (`#ffffff`) — Pure white surface with subtle 1px border.
- **Borders & Dividers:** `Slate-200` (`#e2e8f0`) — Subtle separation.
- **Input Borders:** `Slate-300` (`#cbd5e1`) | **Focus:** `Slate-900` (`#0f172a`).
- **Primary Text:** `Slate-900` (`#0f172a`) — High legibility.
- **Secondary Text:** `Slate-500` (`#64748b`) — Captions and subtle metadata.

### 3.2 Standard Semantic Status Palette
| Status / State | Background | Text Color | Border Color | Typical Usage |
|---|---|---|---|---|
| 🟢 **Approved / Active** | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | Approved leave, Active user, Returned |
| 🟡 **Pending / Review** | `bg-amber-50` | `text-amber-800` | `border-amber-200` | Pending review, Under review |
| 🔵 **Recommended / Info**| `bg-blue-50` | `text-blue-700` | `border-blue-200` | Recommended by moderator, On leave |
| 🟣 **Awaiting Authority**| `bg-purple-50` | `text-purple-700` | `border-purple-200` | Pending Commander/QM final decision |
| 🟠 **Correction Needed** | `bg-orange-50` | `text-orange-700` | `border-orange-200` | Returned for correction |
| 🔴 **Rejected / Overdue** | `bg-rose-50` | `text-rose-700` | `border-rose-200` | Rejected, Overdue return, Cancelled |

---

## 💎 4. Premium Iconography Standard (`lucide-react` Only)

> [!WARNING]
> **Strict Prohibition:** Never use low-quality, mismatched, or third-party web icons.  
> Always use **`lucide-react`** exclusively with consistent stroke widths (`strokeWidth={1.75}` or `2`) and uniform sizes (`w-4 h-4` in buttons, `w-5 h-5` in stat cards).

### Standard Icon Mappings:
- **Approval / Success:** `<CheckCircle2 />`
- **Pending / Clock:** `<Clock />`
- **Recommended:** `<ThumbsUp />`
- **Return / Revision:** `<RotateCcw />`
- **Rejected / Error:** `<XCircle />`
- **Overdue / Alert:** `<AlertTriangle />`
- **User / Personnel:** `<UserCheck />` / `<Users />`
- **Admin / Security:** `<Shield />`
- **Authority / Rank:** `<Award />`
- **Calendar / Date:** `<Calendar />` / `<CalendarCheck />`
- **Reports / Export:** `<FileText />` / `<Download />`
- **Settings:** `<Settings />`

---

## 🧩 5. 100% Reusable Component Mindset (Zero Hardcoding)

Do not reinvent UI elements on individual pages. Build and use clean prebuilt primitives:

1. **`<Button variant="..." size="...">`**
   - Pre-styled CVA variants: `default` (slate-900), `destructive` (rose-600), `success` (emerald-600), `outline`, `secondary`, `ghost`.
2. **`<Input error="..." />` & `<Textarea error="..." />`**
   - Clean 4px box, built-in error display, accessible focus states.
3. **`<StatusBadge status={item.status} />`**
   - Centralized status mapper matching all domain states with the exact semantic Lucide icon + background/text token.
4. **`<StatCard title="..." value="..." icon={...} variant="..." />`**
   - Clean KPI metric card with icon container, bold count, and subtitle.
5. **`<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`**
   - Clean bordered data table with light gray hover and uppercase headers.
6. **`<Modal isOpen={...} onClose={...} title="...">`**
   - Backdrop-blurred 4px dialog for instant actions without disruptive page navigations.

---

## 🧠 6. "Less Text, More Glanceable" UX Guidelines

1. **The 3-Second Rule:** A user must understand the state of their profile or application in under 3 seconds:
   - **Instead of:** *"Your leave application has been submitted on 12/08/2026 and is currently waiting for the moderator review process."*
   - **Use:** Status Badge: `[ 🟡 Pending Review ]` + Date Range: `12 Aug – 18 Aug (7 Days)`.
2. **Action-Driven Approvals (1-Click Decision):**
   - The Commander/QM decision card presents a clean summary:
     - Applicant Name & Rank
     - Unit & Dates
     - Conflict Check: `[ 🟢 None ]`
     - Moderator Remark: `"Recommended without objection"`
     - Two Large Distinct Action Buttons: **`[ Approve (Green) ]`** | **`[ Reject (Red) ]`**.
3. **No Redundant Text on Forms:**
   - Keep placeholders self-explanatory (`e.g., Emergency family reason`).
   - Auto-calculate total days dynamically as soon as start and end dates are picked.

---

## 💻 7. Standard Code Boilerplates

### 7.1 Class Merger Helper (`lib/utils.ts`)
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
```

### 7.2 Standard 4px Button (`components/ui/button.tsx`)
```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white shadow hover:bg-slate-800",
        destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

## 📋 8. Quality Checklist Before Merging Any UI Screen

- [ ] All inputs, buttons, cards, badges, and modals have `rounded-[4px]`.
- [ ] No icons from outside `lucide-react`.
- [ ] Colors use the centralized `slate` and semantic `emerald/amber/rose/blue` tokens.
- [ ] No hardcoded inline status text; uses `<StatusBadge />`.
- [ ] KPI metrics use `<StatCard />`.
- [ ] Text is minimal, high-contrast, and glanceable.
- [ ] Responsive on both mobile and desktop screens.
