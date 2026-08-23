"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-provider";
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  Calendar,
  CalendarCheck,
  FileText,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ClipboardList,
  UserCheck,
  Award,
} from "lucide-react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Personnel", href: "/personnel", icon: Users },
  { label: "Units & Sections", href: "/organization/units", icon: Building2 },
  { label: "Users", href: "/users", icon: Shield },
  {
    label: "Leave",
    icon: ClipboardList,
    children: [
      { label: "All Requests", href: "/leaves" },
      { label: "Leave Types", href: "/leaves/types" },
      { label: "Leave Rules", href: "/leaves/rules" },
      { label: "Balances", href: "/leaves/balances" },
      { label: "Returns", href: "/leaves/returns" },
    ],
  },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Events", href: "/events", icon: CalendarCheck },
  {
    label: "Reports",
    icon: FileText,
    children: [
      { label: "Leave Report", href: "/reports/leave" },
      { label: "Individual Statements", href: "/reports/individual" },
      { label: "Personnel Report", href: "/reports/personnel" },
      { label: "Pending", href: "/reports/pending" },
      { label: "Approved", href: "/reports/approved" },
      { label: "Overdue", href: "/reports/overdue" },
      { label: "Unit-wise", href: "/reports/unit-wise" },
    ],
  },
  { label: "Audit Logs", href: "/audit-logs", icon: FileText },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

const moderatorNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Personnel", href: "/personnel/assigned", icon: UserCheck },
  {
    label: "Leave",
    icon: ClipboardList,
    children: [
      { label: "Assigned Requests", href: "/leaves?scope=assigned" },
      { label: "My Leave", href: "/leaves/my" },
      { label: "Returns", href: "/leaves/returns" },
    ],
  },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Events", href: "/events", icon: CalendarCheck },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

const userNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/profile", icon: Users },
  { label: "Apply Leave", href: "/leaves/apply", icon: ClipboardList },
  { label: "My Leave", href: "/leaves/my", icon: ClipboardList },
  { label: "Leave Balance", href: "/leaves/balances", icon: Award },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Events", href: "/events", icon: CalendarCheck },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const navItems =
    user.role === "ADMIN"
      ? adminNav
      : user.role === "MODERATOR"
      ? moderatorNav
      : userNav;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const toggleGroup = (label: string) => setOpenGroups((p) => ({ ...p, [label]: !p[label] }));

  const renderNav = () => (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {navItems.map((item) => {
        if (item.children) {
          const isGroupOpen = openGroups[item.label];
          const hasActiveChild = item.children.some((c) => isActive(c.href));

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-[4px] transition-colors",
                  hasActiveChild
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isGroupOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              {isGroupOpen && (
                <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-1.5 text-sm rounded-[4px] transition-colors",
                        isActive(child.href)
                          ? "bg-slate-900 text-white font-medium"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href!}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[4px] transition-colors",
              isActive(item.href!)
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-[4px] bg-white border border-slate-200 shadow-sm"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full bg-white border-r border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">Army Leave Mgmt</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-[4px] hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {renderNav()}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-900">Army Leave Mgmt</span>
          <p className="text-[10px] text-slate-500 mt-0.5">Personnel & Leave System</p>
        </div>
        {renderNav()}
      </aside>
    </>
  );
}
