"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface ReportRecord {
  id: string; requestNumber: string; totalDays: number; startDate: string; endDate: string; status: string;
  personnel: { fullName: string; serviceId: string; unit: { name: string } };
  leaveType: { name: string };
}

export default function ApprovedReportPage() {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalCount: 0, totalDaysApproved: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ summary: typeof summary; records: ReportRecord[] }>("/api/reports/approved");
      if (res.success && res.data) { setRecords(res.data.records); setSummary(res.data.summary); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Approved Requests Report" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-slate-500 uppercase">Total Approved</p><p className="text-xl font-bold">{summary.totalCount}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-slate-500 uppercase">Total Days</p><p className="text-xl font-bold text-emerald-700">{summary.totalDaysApproved}</p></CardContent></Card>
      </div>
      {loading ? <PageLoader /> : (
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Personnel</TableHead><TableHead>Unit</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead></TableRow></TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.requestNumber}</TableCell>
                <TableCell className="text-xs font-medium">{r.personnel.fullName}</TableCell>
                <TableCell className="text-xs">{r.personnel.unit.name}</TableCell>
                <TableCell className="text-xs">{r.leaveType.name}</TableCell>
                <TableCell className="text-xs">{formatDate(r.startDate)} – {formatDate(r.endDate)}</TableCell>
                <TableCell className="text-xs">{Number(r.totalDays)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
