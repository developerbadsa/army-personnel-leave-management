"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Mail,
  Phone,
  Pencil,
  CalendarDays,
  MapPin,
  Droplets,
  Shield,
} from "lucide-react";

interface PersonnelProfile {
  id: string;
  serviceId: string;
  fullName: string;
  photoUrl?: string | null;
  rank: string;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: string | null;
  joiningDate?: string | null;
  postingDate?: string | null;
  currentPosting?: string | null;
  previousPosting?: string | null;
  supervisorName?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  unit: { id: string; name: string; code: string };
  section?: { id: string; name: string; code: string } | null;
  user?: {
    id: string;
    email: string;
    role: string;
    approvalAuthority: string;
    status: string;
    lastLoginAt?: string | null;
  } | null;
  leaveBalances: Array<{
    id: string;
    year: number;
    allocatedDays: string | number;
    carryForward: string | number;
    usedDays: string | number;
    reservedDays: string | number;
    leaveType: { name: string; code: string };
  }>;
  leaveRequests: Array<{
    id: string;
    requestNumber: string;
    startDate: string;
    endDate: string;
    totalDays: string | number;
    status: string;
    reason: string;
    leaveType: { name: string; code: string };
  }>;
}

const toNum = (v: string | number | undefined | null): number => Number(v ?? 0);

export default function PersonnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [personnel, setPersonnel] = useState<PersonnelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetchApi<PersonnelProfile>(`/api/personnel/${params.id}`);
      if (res.success && res.data) {
        setPersonnel(res.data);
      } else {
        setError(res.error || "Personnel record not found");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load personnel record");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (!personnel) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.push("/personnel")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold text-slate-900">Personnel Profile</h1>
          </div>
          <p className="text-sm text-slate-500">{error || "Personnel record not found"}</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalEntitlement = (b: PersonnelProfile["leaveBalances"][number]) =>
    toNum(b.allocatedDays) + toNum(b.carryForward) + toNum(b.reservedDays);

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/personnel")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Personnel Profile</h1>
              <StatusBadge status={personnel.status} className="text-[9px]" />
            </div>
            <p className="text-xs text-slate-500">
              {personnel.fullName} · {personnel.serviceId}
            </p>
          </div>
          {user?.role === "ADMIN" && (
            <Link href={`/personnel/${personnel.id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit Profile
              </Button>
            </Link>
          )}
          <Link href={`/reports/individual/${personnel.id}`}>
            <Button size="sm" variant="outline">
              <FileText className="w-3.5 h-3.5 mr-1" />
              Leave Statement
            </Button>
          </Link>
        </div>

        {/* Identity Banner */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {personnel.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personnel.photoUrl}
                  alt={personnel.fullName}
                  className="w-12 h-12 rounded-[4px] object-cover bg-slate-100"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-900 text-white rounded-[4px] flex items-center justify-center font-bold text-base shrink-0">
                  {personnel.rank.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900">{personnel.fullName}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {personnel.rank} · ID: {personnel.serviceId}
                </p>
                <p className="text-[11px] text-slate-400">
                  Unit: {personnel.unit.name} ({personnel.unit.code})
                  {personnel.section ? ` · Section: ${personnel.section.name}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] min-w-[90px] text-center">
                <p className="text-[10px] text-slate-500 uppercase">Record #</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{personnel.serviceId}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] min-w-[90px] text-center">
                <p className="text-[10px] text-slate-500 uppercase">Joined</p>
                <p className="text-xs font-semibold text-slate-900 mt-0.5">
                  {formatDate(personnel.joiningDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Login Account
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {personnel.user ? (
                <div className="space-y-2 pt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-700 font-mono">{personnel.user.email}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={personnel.user.role} className="text-[9px]" />
                    <StatusBadge status={personnel.user.status} className="text-[9px]" />
                    {personnel.user.approvalAuthority !== "NONE" && (
                      <StatusBadge status={personnel.user.approvalAuthority} className="text-[9px]" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Last login: {formatDate(personnel.user.lastLoginAt)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 pt-4">No login account linked to this record.</p>
              )}
            </CardContent>
          </Card>

          {/* Service & Contact Details */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Contact & Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <dl className="divide-y divide-slate-50">
                <InfoRow icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} label="Phone" value={personnel.phone} />
                <InfoRow icon={<Mail className="w-3.5 h-3.5 text-slate-400" />} label="Email" value={personnel.email} />
                <InfoRow icon={<Droplets className="w-3.5 h-3.5 text-slate-400" />} label="Blood Group" value={personnel.bloodGroup} />
                <InfoRow icon={<CalendarDays className="w-3.5 h-3.5 text-slate-400" />} label="Posting Date" value={formatDate(personnel.postingDate)} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />} label="Current Posting" value={personnel.currentPosting} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />} label="Previous Posting" value={personnel.previousPosting} />
                <InfoRow icon={<Shield className="w-3.5 h-3.5 text-slate-400" />} label="Supervisor" value={personnel.supervisorName} />
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Leave Balances */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Leave Balances — {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {personnel.leaveBalances.length === 0 ? (
              <p className="text-xs text-slate-400 pt-4">No leave balances initialized for this year.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-4">
                {personnel.leaveBalances.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-medium truncate" title={b.leaveType.name}>
                      {b.leaveType.name}
                    </p>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {toNum(b.allocatedDays) + toNum(b.carryForward) - toNum(b.usedDays)}
                    </p>
                    <p className="text-[10px] text-slate-400">left of {totalEntitlement(b)}d</p>
                    {toNum(b.carryForward) > 0 && (
                      <p className="text-[9px] text-amber-600">incl. {toNum(b.carryForward)}d carry fwd</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm">Recent Leave Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {personnel.leaveRequests.length === 0 ? (
              <p className="text-xs text-slate-400 p-6 text-center">No leave requests recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnel.leaveRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link
                          href={`/leaves/${r.id}`}
                          className="font-mono text-xs font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {r.requestNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{r.leaveType.name}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(r.startDate)} → {formatDate(r.endDate)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">{toNum(r.totalDays)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} className="text-[9px]" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {personnel.leaveRequests.length > 0 && (
            <CardContent className="p-3 border-t border-slate-100">
              <Link
                href={`/reports/individual/${personnel.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                View full leave statement
                <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 gap-3">
      <dt className="flex items-center gap-2 text-[11px] text-slate-500 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-xs font-medium text-slate-900 text-right min-w-0">
        {value ? (
          <span className="truncate block max-w-[180px]">{value}</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </dd>
    </div>
  );
}
