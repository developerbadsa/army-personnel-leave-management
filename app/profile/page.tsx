"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { User, Mail, Shield, Award, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-lg font-bold text-slate-900">My Profile</h1>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-slate-200 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{user.personnel?.fullName || "No personnel linked"}</p>
                <p className="text-[10px] text-slate-500">{user.personnel?.rank || ""}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
              <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Role" value={<StatusBadge status={user.role} className="text-[9px]" />} />
              <InfoRow icon={<Award className="w-3.5 h-3.5" />} label="Authority" value={<StatusBadge status={user.approvalAuthority} className="text-[9px]" />} />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Last Login" value={formatDate(user.lastLoginAt)} />
            </div>
          </CardContent>
        </Card>

        {user.personnel && (
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Personnel Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500">Service ID:</span> <span className="font-mono font-medium">{user.personnel.serviceId}</span></div>
              <div><span className="text-slate-500">Rank:</span> <span className="font-medium">{user.personnel.rank}</span></div>
              {user.personnel.unit && <div><span className="text-slate-500">Unit:</span> {user.personnel.unit.name}</div>}
              {user.personnel.section && <div><span className="text-slate-500">Section:</span> {user.personnel.section.name}</div>}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
