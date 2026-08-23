"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface ReportRecord {
  id: string; requestNumber: string; totalDays: number; startDate: string; endDate: string; status: string;
  personnel: { fullName: string; serviceId: string; rank: string; unit: { name: string } };
  leaveType: { name: string };
}

export default function PendingReportPage() {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalCount: 0, statusBreakdown: {} as Record<string, number> });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ summary: typeof summary; records: ReportRecord[] }>("/api/reports/pending");
      if (res.success && res.data) { setRecords(res.data.records); setSummary(res.data.summary); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Pending Requests Report" description={`${summary.totalCount} pending requests`} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-slate-500 uppercase">Total Pending</p><p className="text-xl font-bold">{summary.totalCount}</p></CardContent></Card>
        {Object.entries(summary.statusBreakdown).map(([k, v]) => (
          <Card key={k}><CardContent className="p-3 text-center"><p className="text-[10px] text-slate-500 uppercase">{k.replace(/_/g, " ")}</p><p className="text-xl font-bold">{v}</p></CardContent></Card>
        ))}
      </div>
      {loading ? <PageLoader /> : (
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Personnel</TableHead><TableHead>Unit</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Link href={`/leaves/${r.id}`} className="font-mono text-xs hover:text-blue-600">{r.requestNumber}</Link></TableCell>
                <TableCell><p className="text-xs font-medium">{r.personnel.fullName}</p></TableCell>
                <TableCell className="text-xs">{r.personnel.unit.name}</TableCell>
                <TableCell className="text-xs">{r.leaveType.name}</TableCell>
                <TableCell className="text-xs">{formatDate(r.startDate)} – {formatDate(r.endDate)}</TableCell>
                <TableCell className="text-xs">{Number(r.totalDays)}</TableCell>
                <TableCell><StatusBadge status={r.status} className="text-[9px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
