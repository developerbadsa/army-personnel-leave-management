"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  FileText, Users, Clock, CheckCircle2, AlertTriangle, Building2,
} from "lucide-react";

const reportCards = [
  { title: "Leave Report", description: "Full leave report with filters", href: "/reports/leave", icon: FileText, color: "bg-slate-100 text-slate-700" },
  { title: "Individual Statements", description: "Detailed annual leave statement by personnel", href: "/reports/individual", icon: Users, color: "bg-indigo-50 text-indigo-700" },
  { title: "Personnel Report", description: "Personnel breakdown by unit/status", href: "/reports/personnel", icon: Users, color: "bg-blue-50 text-blue-700" },
  { title: "Pending Requests", description: "Leave requests awaiting action", href: "/reports/pending", icon: Clock, color: "bg-amber-50 text-amber-700" },
  { title: "Approved Requests", description: "All approved leave records", href: "/reports/approved", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
  { title: "Overdue Returns", description: "Personnel with overdue returns", href: "/reports/overdue", icon: AlertTriangle, color: "bg-rose-50 text-rose-700" },
  { title: "Unit-wise Report", description: "Leave breakdown by unit", href: "/reports/unit-wise", icon: Building2, color: "bg-purple-50 text-purple-700" },
];

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Reports" description="View and export reports" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reportCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-all hover:border-slate-300 cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[4px] border flex items-center justify-center shrink-0 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                  <p className="text-[10px] text-slate-500">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
