"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import Link from "next/link";
import { Users, Plus, Search } from "lucide-react";

interface PersonnelRecord {
  id: string;
  serviceId: string;
  fullName: string;
  rank: string;
  phone?: string;
  status: string;
  unit: { id: string; name: string; code: string };
  section?: { id: string; name: string; code: string } | null;
  user?: { id: string; email: string; role: string } | null;
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
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

      const res = await fetchApi<PersonnelRecord[]>(`/api/personnel?${params}`);
      if (res.success && res.data) {
        setPersonnel(res.data);
        setMeta(res.meta || { total: 0, totalPages: 1 });
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Personnel"
        description={`${meta.total} total personnel`}
        actions={
          <Link href="/personnel/new">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" />
              Add Personnel
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by name, ID, rank..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "All Status" },
            { value: "ACTIVE", label: "Active" },
            { value: "ON_LEAVE", label: "On Leave" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "TRANSFERRED", label: "Transferred" },
            { value: "RETIRED", label: "Retired" },
          ]}
          className="w-full sm:w-40"
        />
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : personnel.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No personnel found"
          description="No personnel records match your search criteria."
        />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service ID</TableHead>
                <TableHead>Name / Rank</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnel.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/personnel/${p.id}`}
                      className="font-mono text-xs font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {p.serviceId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium text-slate-900">{p.fullName}</p>
                      <p className="text-[10px] text-slate-500">{p.rank}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{p.unit.name}</TableCell>
                  <TableCell className="text-xs">{p.section?.name || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} className="text-[9px]" />
                  </TableCell>
                  <TableCell>
                    {p.user ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[4px]">
                        Linked
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {page} of {meta.totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
