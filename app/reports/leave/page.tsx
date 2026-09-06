"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { FileText, Download } from "lucide-react";

interface ReportRecord {
  id: string;
  requestNumber: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  status: string;
  personnel: { fullName: string; serviceId: string; rank: string; unit: { name: string }; section?: { name: string } | null };
  leaveType: { name: string; code: string };
}

export default function LeaveReportPage() {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalCount: 0, totalApprovedDays: 0, statusBreakdown: {} as Record<string, number> });
  const [statusFilter, setStatusFilter] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("startDate", `${year}-01-01`);
      params.set("endDate", `${year}-12-31`);
      const res = await fetchApi<{ summary: typeof summary; records: ReportRecord[] }>(`/api/reports/leave?${params}`);
      if (res.success && res.data) {
        setRecords(res.data.records);
        setSummary(res.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    window.open(`/api/reports/export/excel?startDate=${year}-01-01&endDate=${year}-12-31${statusFilter ? `&status=${statusFilter}` : ""}`, "_blank");
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Report"
        description="Leave records with filters"
        actions={
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Total Requests</p>
          <p className="text-xl font-bold text-slate-900">{summary.totalCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Approved Days</p>
          <p className="text-xl font-bold text-emerald-700">{summary.totalApprovedDays}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Pending</p>
          <p className="text-xl font-bold text-amber-700">{summary.statusBreakdown["PENDING_REVIEW"] || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Rejected</p>
          <p className="text-xl font-bold text-rose-700">{summary.statusBreakdown["REJECTED"] || 0}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-8 px-2 text-xs border border-slate-300 rounded-[4px] bg-white">
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Status" },
            { value: "APPROVED", label: "Approved" },
            { value: "PENDING_REVIEW", label: "Pending" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          className="w-40 h-8"
        />
      </div>

      {loading ? <PageLoader /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Personnel</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.requestNumber}</TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{r.personnel.fullName}</p>
                  <p className="text-[10px] text-slate-500">{r.personnel.serviceId}</p>
                </TableCell>
                <TableCell className="text-xs">{r.personnel.unit.name}</TableCell>
                <TableCell className="text-xs">{r.leaveType.name}</TableCell>
                <TableCell className="text-xs">{formatDate(r.startDate)} – {formatDate(r.endDate)}</TableCell>
                <TableCell className="text-xs font-medium">{Number(r.totalDays)}</TableCell>
                <TableCell><StatusBadge status={r.status} className="text-[9px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
