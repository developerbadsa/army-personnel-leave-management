"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { UserCheck, Search } from "lucide-react";

interface PersonnelRecord {
  id: string;
  serviceId: string;
  fullName: string;
  rank: string;
  status: string;
  unit: { name: string };
  section?: { name: string } | null;
}

export default function AssignedPersonnelPage() {
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetchApi<PersonnelRecord[]>(`/api/personnel/assigned${params}`);
      if (res.success && res.data) setPersonnel(res.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Assigned Personnel" description="Personnel under your scope" />

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input placeholder="Search personnel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      {loading ? <PageLoader /> : personnel.length === 0 ? (
        <EmptyState icon={UserCheck} title="No assigned personnel" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personnel.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link href={`/personnel/${p.id}`} className="font-mono text-xs hover:text-blue-600">{p.serviceId}</Link></TableCell>
                <TableCell><p className="text-xs font-medium">{p.fullName}</p></TableCell>
                <TableCell className="text-xs">{p.unit.name}</TableCell>
                <TableCell className="text-xs">{p.section?.name || "—"}</TableCell>
                <TableCell><StatusBadge status={p.status} className="text-[9px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
