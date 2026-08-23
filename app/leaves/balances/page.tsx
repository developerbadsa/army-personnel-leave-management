"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";

interface Balance {
  id: string;
  leaveType: { name: string; code: string };
  allocatedDays: number;
  carryForward: number;
  adjustmentDays: number;
  usedDays: number;
  reservedDays: number;
  remainingDays: number;
}

export default function BalancesPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<Balance[]>(`/api/leaves/balances/me?year=${year}`);
      if (res.success && res.data) setBalances(res.data);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Balance"
        description={`Balance for ${year}`}
        actions={
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 px-2 text-xs border border-slate-300 rounded-[4px] bg-white"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      />

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {balances.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">
                  {b.leaveType.name}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400">Allocated</p>
                    <p className="text-sm font-bold text-slate-900">{b.allocatedDays}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Carry Forward</p>
                    <p className="text-sm font-medium text-slate-700">{b.carryForward}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Used</p>
                    <p className="text-sm font-medium text-rose-600">{b.usedDays}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Reserved</p>
                    <p className="text-sm font-medium text-amber-600">{b.reservedDays}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Adjustment</p>
                    <p className="text-sm font-medium text-blue-600">{b.adjustmentDays}</p>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <p className="text-[10px] text-slate-400">Remaining</p>
                    <p className="text-lg font-bold text-emerald-700">{b.remainingDays}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
