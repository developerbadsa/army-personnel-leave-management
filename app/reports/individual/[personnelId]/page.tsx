"use client";

import React, { useEffect, useState, use } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Printer, Download, User, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface IndividualReportData {
  personnel: {
    id: string;
    serviceId: string;
    fullName: string;
    rank: string;
    phone?: string;
    unit: { name: string; code: string };
    section?: { name: string; code: string } | null;
  };
  year: number;
  summary: {
    totalRequests: number;
    approvedDays: number;
    pendingDays: number;
  };
  balances: Array<{
    leaveTypeName: string;
    code: string;
    allocatedDays: number;
    carryForward: number;
    usedDays: number;
    remainingDays: number;
  }>;
  leaveRequests: Array<{
    id: string;
    requestNumber: string;
    leaveType: { name: string; code: string };
    startDate: string;
    endDate: string;
    totalDays: number;
    status: string;
    reason: string;
  }>;
}

export default function IndividualReportDetailPage({
  params,
}: {
  params: Promise<{ personnelId: string }>;
}) {
  const { personnelId } = use(params);
  const [data, setData] = useState<IndividualReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    setLoading(true);
    fetchApi<IndividualReportData>(`/api/reports/individual/${personnelId}?year=${selectedYear}`)
      .then((res) => {
        if (res.success && res.data) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, [personnelId, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();

    // Title & Header
    doc.setFontSize(16);
    doc.text("ARMY PERSONNEL LEAVE STATEMENT", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

    // Personnel Info Box
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Name: ${data.personnel.fullName} (${data.personnel.rank})`, 14, 35);
    doc.text(`Service ID: ${data.personnel.serviceId}`, 14, 42);
    doc.text(`Unit: ${data.personnel.unit.name} (${data.personnel.unit.code})`, 120, 35);
    doc.text(`Year: ${data.year}`, 120, 42);

    // Balances Table
    const balanceRows = data.balances.map((b) => [
      b.leaveTypeName,
      b.allocatedDays,
      b.carryForward,
      b.usedDays,
      b.remainingDays,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Leave Type", "Allocated", "Carry Fwd", "Used", "Remaining"]],
      body: balanceRows,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] },
    });

    // Leave Requests Table
    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.text("Leave History Ledger", 14, lastY + 12);

    const historyRows = data.leaveRequests.map((r) => [
      r.requestNumber,
      r.leaveType.name,
      `${formatDate(r.startDate)} - ${formatDate(r.endDate)}`,
      r.totalDays,
      r.status,
      r.reason,
    ]);

    autoTable(doc, {
      startY: lastY + 16,
      head: [["Request #", "Type", "Dates", "Days", "Status", "Reason"]],
      body: historyRows,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`Leave_Statement_${data.personnel.serviceId}_${data.year}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="print:hidden">
        <PageHeader
          title="Individual Leave Statement"
          description="Detailed annual leave statement and history"
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={[
                  { value: "2026", label: "Year 2026" },
                  { value: "2025", label: "Year 2025" },
                  { value: "2024", label: "Year 2024" },
                ]}
              />
              <Button variant="outline" size="sm" onClick={handlePrint} className="cursor-pointer">
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>
              <Button size="sm" onClick={handleExportPDF} className="cursor-pointer">
                <Download className="w-3.5 h-3.5 mr-1" />
                Export PDF
              </Button>
            </div>
          }
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : !data ? (
        <p className="text-xs text-slate-500">Personnel data not found</p>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Personnel Identity Banner */}
          <Card>
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-[4px] flex items-center justify-center font-bold text-base">
                  {data.personnel.rank.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{data.personnel.fullName}</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {data.personnel.rank} · ID: {data.personnel.serviceId}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Unit: {data.personnel.unit.name} ({data.personnel.unit.code})
                    {data.personnel.section ? ` · Section: ${data.personnel.section.name}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 text-right">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] min-w-[90px] text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Year</p>
                  <p className="text-base font-bold text-slate-900">{data.year}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] min-w-[90px] text-center">
                  <p className="text-[10px] text-emerald-700 uppercase">Approved</p>
                  <p className="text-base font-bold text-emerald-700">{data.summary.approvedDays}d</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Balances Grid */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
              Leave Entitlement & Remaining Balances
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {data.balances.map((b) => (
                <Card key={b.code}>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{b.leaveTypeName}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{b.remainingDays}</p>
                    <p className="text-[10px] text-slate-400">left of {b.allocatedDays + b.carryForward}d</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Leave History Table */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm">Leave History for {data.year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.leaveRequests.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">No leave requests recorded for {data.year}.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.leaveRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold text-slate-900">{r.requestNumber}</TableCell>
                        <TableCell>{r.leaveType.name}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {formatDate(r.startDate)} → {formatDate(r.endDate)}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">{r.totalDays}</TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} className="text-[9px]" />
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{r.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
