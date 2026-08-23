"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface OverdueRecord {
  id: string; expectedReturnDate: string; daysOverdue: number;
  personnel: { fullName: string; serviceId: string; rank: string; unit: { name: string } };
  leaveRequest: { requestNumber: string; leaveType: { name: string } };
}

export default function OverdueReportPage() {
  const [records, setRecords] = useState<OverdueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ summary: { totalOverdue: number }; records: OverdueRecord[] }>("/api/reports/overdue");
      if (res.success && res.data) setRecords(res.data.records);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Overdue Returns Report" description={`${records.length} overdue`} />
      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No overdue returns" description="All returns are on track." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Personnel</TableHead><TableHead>Unit</TableHead><TableHead>Leave #</TableHead><TableHead>Expected Return</TableHead><TableHead>Days Overdue</TableHead></TableRow></TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell><p className="text-xs font-medium">{r.personnel.fullName}</p><p className="text-[10px] text-slate-500">{r.personnel.rank} · {r.personnel.serviceId}</p></TableCell>
                <TableCell className="text-xs">{r.personnel.unit.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.leaveRequest.requestNumber}</TableCell>
                <TableCell className="text-xs">{formatDate(r.expectedReturnDate)}</TableCell>
                <TableCell><span className="text-sm font-bold text-rose-600">{r.daysOverdue} days</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
