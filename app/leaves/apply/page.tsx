"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi, apiPost } from "@/lib/api";
import { AlertCircle, CheckCircle2, Calculator } from "lucide-react";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  minDays?: number;
  maxDays?: number;
  requiresAttachment: boolean;
}

interface Personnel {
  id: string;
  serviceId: string;
  fullName: string;
}

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [form, setForm] = useState({
    personnelId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    contactDuringLeave: "",
    addressDuringLeave: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi<LeaveType[]>("/api/leaves/types").then((res) => {
      if (res.success && res.data) setLeaveTypes(res.data);
    });
    fetchApi<Personnel[]>("/api/personnel?limit=200").then((res) => {
      if (res.success && res.data) setPersonnel(res.data);
    });
  }, []);

  const totalDays = calculateDays(form.startDate, form.endDate);
  const selectedType = leaveTypes.find((t) => t.id === form.leaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiPost("/api/leaves/apply", form);
      setSuccess(true);
      setTimeout(() => router.push("/leaves/my"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Leave Application Submitted!</h2>
          <p className="text-xs text-slate-500 mt-1">Redirecting to your leave requests...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Apply for Leave" description="Submit a new leave application" />

      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[4px]">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Personnel *</label>
                  <Select
                    value={form.personnelId}
                    onChange={(e) => setForm({ ...form, personnelId: e.target.value })}
                    options={personnel.map((p) => ({
                      value: p.id,
                      label: `${p.fullName} (${p.serviceId})`,
                    }))}
                    placeholder="Select personnel"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Leave Type *</label>
                  <Select
                    value={form.leaveTypeId}
                    onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                    options={leaveTypes.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                    placeholder="Select type"
                  />
                </div>
              </div>

              {selectedType && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-[4px] text-[10px] text-slate-600 flex gap-4">
                  {selectedType.minDays && <span>Min: {selectedType.minDays} day(s)</span>}
                  {selectedType.maxDays && <span>Max: {selectedType.maxDays} day(s)</span>}
                  {selectedType.requiresAttachment && <span className="text-amber-700">Attachment required</span>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Start Date *</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">End Date *</label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    min={form.startDate || undefined}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Total Days</label>
                  <div className="h-9 flex items-center gap-2 px-3 bg-slate-50 border border-slate-200 rounded-[4px]">
                    <Calculator className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-900">{totalDays || "—"}</span>
                    <span className="text-[10px] text-slate-500">day(s)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Reason *</label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason for leave..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Contact During Leave</label>
                  <Input
                    value={form.contactDuringLeave}
                    onChange={(e) => setForm({ ...form, contactDuringLeave: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Address During Leave</label>
                  <Input
                    value={form.addressDuringLeave}
                    onChange={(e) => setForm({ ...form, addressDuringLeave: e.target.value })}
                    placeholder="Whereabouts during leave"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Emergency Contact Name</label>
                  <Input
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Emergency Contact Phone</label>
                  <Input
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.personnelId || !form.leaveTypeId || !form.startDate || !form.endDate || !form.reason}>
                  {saving ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
