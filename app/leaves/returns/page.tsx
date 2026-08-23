"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { fetchApi, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface ReturnRecord {
  id: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: string;
  computedStatus: string;
  daysOverdue?: number;
  personnel: { fullName: string; serviceId: string; rank: string; unit: { name: string } };
  leaveRequest: { requestNumber: string; leaveType: { name: string } };
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?${filter}` : "";
      const res = await fetchApi<ReturnRecord[]>(`/api/leaves/returns${params}`);
      if (res.success && res.data) setReturns(res.data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markReturned = async (id: string) => {
    try {
      await apiPost(`/api/leaves/returns/${id}`, {});
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Leave Returns" description="Track return from leave" />

      <div className="flex gap-1 mb-4">
        {[
          { label: "All", value: "" },
          { label: "Overdue", value: "overdue=true" },
          { label: "Returned", value: "status=RETURNED" },
        ].map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)} className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${filter === tab.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : returns.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No return records" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personnel</TableHead>
              <TableHead>Leave #</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead>Actual Return</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="text-xs font-medium">{r.personnel.fullName}</p>
                  <p className="text-[10px] text-slate-500">{r.personnel.serviceId}</p>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.leaveRequest.requestNumber}</TableCell>
                <TableCell className="text-xs">{formatDate(r.expectedReturnDate)}</TableCell>
                <TableCell className="text-xs">{r.actualReturnDate ? formatDate(r.actualReturnDate) : "—"}</TableCell>
                <TableCell><StatusBadge status={r.computedStatus} className="text-[9px]" /></TableCell>
                <TableCell>
                  {r.daysOverdue ? (
                    <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {r.daysOverdue}d
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {!r.actualReturnDate && (
                    <Button size="sm" variant="success" onClick={() => markReturned(r.id)}>
                      Mark Returned
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
