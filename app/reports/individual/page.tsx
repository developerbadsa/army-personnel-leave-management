"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { User, Search, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PersonnelItem {
  id: string;
  serviceId: string;
  fullName: string;
  rank: string;
  unit: { name: string; code: string };
  section?: { name: string } | null;
}

export default function IndividualReportDirectoryPage() {
  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<PersonnelItem[]>("/api/personnel?limit=200").then((res) => {
      if (res.success && res.data) setPersonnel(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = personnel.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.serviceId.toLowerCase().includes(search.toLowerCase()) ||
      p.rank.toLowerCase().includes(search.toLowerCase()) ||
      p.unit.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Individual Leave Reports"
        description="Select a personnel to view their comprehensive annual leave statement and history"
      />

      <div className="max-w-3xl space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Search by name, service ID, rank, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6">Loading personnel list...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500 py-6">No personnel found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((p) => (
              <Link key={p.id} href={`/reports/individual/${p.id}`}>
                <Card className="hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-900 text-white rounded-[4px] flex items-center justify-center font-bold text-xs">
                        {p.rank.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{p.fullName}</p>
                        <p className="text-[11px] text-slate-500">
                          {p.rank} · {p.serviceId}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {p.unit.name} {p.section ? `(${p.section.name})` : ""}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
