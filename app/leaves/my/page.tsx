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
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

interface LeaveRequest {
  id: string;
  requestNumber: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  status: string;
  leaveType: { name: string };
  createdAt: string;
}

export default function MyLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusTab ? `?status=${statusTab}` : "";
      const res = await fetchApi<LeaveRequest[]>(`/api/leaves/my${params}`);
      if (res.success && res.data) setLeaves(res.data);
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader
        title="My Leave Requests"
        actions={
          <Link href="/leaves/apply">
            <Button size="sm"><Plus className="w-3.5 h-3.5" /> Apply Leave</Button>
          </Link>
        }
      />

      <div className="flex gap-1 mb-4">
        {["", "PENDING_REVIEW", "APPROVED", "REJECTED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
              statusTab === tab ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab ? tab.replace(/_/g, " ") : "All"}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : leaves.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No leave requests" description="You haven't applied for leave yet." action={<Link href="/leaves/apply"><Button size="sm">Apply Leave</Button></Link>} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link href={`/leaves/${l.id}`} className="font-mono text-xs font-medium hover:text-blue-600">{l.requestNumber}</Link>
                </TableCell>
                <TableCell className="text-xs">{l.leaveType.name}</TableCell>
                <TableCell className="text-xs">{formatDate(l.startDate)} – {formatDate(l.endDate)}</TableCell>
                <TableCell className="text-xs font-medium">{Number(l.totalDays)}</TableCell>
                <TableCell><StatusBadge status={l.status} className="text-[9px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
