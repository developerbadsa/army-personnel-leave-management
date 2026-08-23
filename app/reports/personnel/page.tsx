"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { Users, Download } from "lucide-react";

interface PersonnelRecord {
  id: string; serviceId: string; fullName: string; rank: string; status: string;
  unit: { name: string; code: string }; section?: { name: string } | null;
}

export default function PersonnelReportPage() {
  const [records, setRecords] = useState<PersonnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalPersonnel: 0, byStatus: {} as Record<string, number>, byRank: {} as Record<string, number> });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ summary: typeof summary; records: PersonnelRecord[] }>("/api/reports/personnel");
      if (res.success && res.data) { setRecords(res.data.records); setSummary(res.data.summary); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Personnel Report" description="Personnel breakdown" actions={<Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> Export</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-slate-500 uppercase">Total</p><p className="text-xl font-bold">{summary.totalPersonnel}</p></CardContent></Card>
        {Object.entries(summary.byStatus).map(([status, count]) => (
          <Card key={status}><CardContent className="p-3 text-center"><p className="text-[10px] text-slate-500 uppercase">{status.replace(/_/g, " ")}</p><p className="text-xl font-bold">{count}</p></CardContent></Card>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Rank</TableHead><TableHead>Unit</TableHead><TableHead>Section</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.serviceId}</TableCell>
                <TableCell className="text-xs font-medium">{r.fullName}</TableCell>
                <TableCell className="text-xs">{r.rank}</TableCell>
                <TableCell className="text-xs">{r.unit.name}</TableCell>
                <TableCell className="text-xs">{r.section?.name || "—"}</TableCell>
                <TableCell><StatusBadge status={r.status} className="text-[9px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DashboardLayout>
  );
}
