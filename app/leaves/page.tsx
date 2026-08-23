"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ClipboardList, Plus, Search } from "lucide-react";

interface LeaveRequest {
  id: string;
  requestNumber: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
  createdAt: string;
  personnel: {
    fullName: string;
    serviceId: string;
    rank: string;
    unit: { name: string };
    section?: { name: string } | null;
  };
  leaveType: { name: string; code: string };
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING_REVIEW" },
  { label: "Awaiting", value: "PENDING_FINAL_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Returned", value: "RETURNED_FOR_CORRECTION" },
];

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetchApi<LeaveRequest[]>(`/api/leaves?${params}`);
      if (res.success && res.data) {
        setLeaves(res.data);
        setMeta(res.meta || { total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Requests"
        description={`${meta.total} total requests`}
        actions={
          <Link href="/leaves/apply">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" /> Apply Leave
            </Button>
          </Link>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Search by request number, name, service ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-8"
        />
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : leaves.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No leave requests found" />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Personnel</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link
                      href={`/leaves/${l.id}`}
                      className="font-mono text-xs font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {l.requestNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium">{l.personnel.fullName}</p>
                      <p className="text-[10px] text-slate-500">{l.personnel.rank} · {l.personnel.serviceId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{l.leaveType.name}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p>{formatDate(l.startDate)}</p>
                      <p className="text-slate-400">to {formatDate(l.endDate)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{Number(l.totalDays)}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} className="text-[9px]" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Page {page} of {meta.totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
