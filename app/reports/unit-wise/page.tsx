"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";

interface UnitReport {
  unit: { id: string; name: string; code: string };
  personnelCount: number;
  activeCount: number;
  leaveSummary: { totalLeaveDays: number; approvedDays: number; pendingDays: number };
}

export default function UnitWiseReportPage() {
  const [units, setUnits] = useState<UnitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ year: number; units: UnitReport[] }>(`/api/reports/unit-wise?year=${year}`);
      if (res.success && res.data) setUnits(res.data.units);
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Unit-wise Report" description={`Leave breakdown by unit — ${year}`}
        actions={
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-8 px-2 text-xs border border-slate-300 rounded-[4px] bg-white">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />
      {loading ? <PageLoader /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {units.map((u) => (
            <Card key={u.unit.id}>
              <CardContent className="p-4">
                <div className="mb-3">
                  <p className="text-xs font-mono text-slate-500">{u.unit.code}</p>
                  <p className="text-sm font-bold text-slate-900">{u.unit.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-[10px] text-slate-400">Personnel</p><p className="font-bold">{u.activeCount} / {u.personnelCount}</p></div>
                  <div><p className="text-[10px] text-slate-400">Total Leave Days</p><p className="font-bold">{u.leaveSummary.totalLeaveDays}</p></div>
                  <div><p className="text-[10px] text-slate-400">Approved</p><p className="font-bold text-emerald-700">{u.leaveSummary.approvedDays}</p></div>
                  <div><p className="text-[10px] text-slate-400">Pending</p><p className="font-bold text-amber-700">{u.leaveSummary.pendingDays}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
