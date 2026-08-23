"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi, apiPost } from "@/lib/api";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  code: string;
  sections?: Array<{ id: string; name: string; code: string }>;
}

interface UserOption {
  id: string;
  email: string;
  role: string;
}

export default function NewPersonnelPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    serviceId: "",
    fullName: "",
    rank: "",
    phone: "",
    email: "",
    bloodGroup: "",
    joiningDate: "",
    postingDate: "",
    currentPosting: "",
    previousPosting: "",
    supervisorName: "",
    unitId: "",
    sectionId: "",
    userId: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchApi<Unit[]>("/api/units").then((res) => {
      if (res.success && res.data) setUnits(res.data);
    });
    fetchApi<UserOption[]>("/api/users").then((res) => {
      if (res.success && res.data) setAvailableUsers(res.data);
    });
  }, []);

  const selectedUnit = units.find((u) => u.id === form.unitId);
  const sections = selectedUnit?.sections || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await apiPost("/api/personnel", {
        ...form,
        sectionId: form.sectionId || undefined,
        userId: form.userId || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        bloodGroup: form.bloodGroup || undefined,
        joiningDate: form.joiningDate || undefined,
        postingDate: form.postingDate || undefined,
        currentPosting: form.currentPosting || undefined,
        previousPosting: form.previousPosting || undefined,
        supervisorName: form.supervisorName || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push("/personnel"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create personnel");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Personnel Created Successfully!</h2>
          <p className="text-xs text-slate-500 mt-1">Redirecting to personnel list...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Add Personnel"
        description="Create a new army personnel record"
      />

      <div className="max-w-3xl">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[4px]">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}

              {/* Service Details */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Service Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Service ID (BA / BJO / No) *</label>
                    <Input
                      placeholder="e.g. BA-10023"
                      value={form.serviceId}
                      onChange={(e) => setForm({ ...form, serviceId: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Full Name *</label>
                    <Input
                      placeholder="Full Name"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Rank *</label>
                    <Input
                      placeholder="e.g. Major / Captain / Sergeant"
                      value={form.rank}
                      onChange={(e) => setForm({ ...form, rank: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Unit & Section */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Unit & Section Posting
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Unit *</label>
                    <Select
                      value={form.unitId}
                      onChange={(e) => setForm({ ...form, unitId: e.target.value, sectionId: "" })}
                      options={units.map((u) => ({
                        value: u.id,
                        label: `${u.name} (${u.code})`,
                      }))}
                      placeholder="Select unit"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Section (Optional)</label>
                    <Select
                      value={form.sectionId}
                      onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                      options={sections.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.code})`,
                      }))}
                      placeholder="Select section"
                      disabled={!form.unitId || sections.length === 0}
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Personal */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Contact & Personal Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Phone</label>
                    <Input
                      placeholder="017XXXXXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Email</label>
                    <Input
                      type="email"
                      placeholder="personnel@army.local"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Blood Group</label>
                    <Select
                      value={form.bloodGroup}
                      onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                      options={[
                        { value: "A+", label: "A+" },
                        { value: "A-", label: "A-" },
                        { value: "B+", label: "B+" },
                        { value: "B-", label: "B-" },
                        { value: "AB+", label: "AB+" },
                        { value: "AB-", label: "AB-" },
                        { value: "O+", label: "O+" },
                        { value: "O-", label: "O-" },
                      ]}
                      placeholder="Select group"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Postings */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Posting & Service History
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Joining Date</label>
                    <Input
                      type="date"
                      value={form.joiningDate}
                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Posting Date</label>
                    <Input
                      type="date"
                      value={form.postingDate}
                      onChange={(e) => setForm({ ...form, postingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Current Posting</label>
                    <Input
                      placeholder="e.g. Headquarters Company"
                      value={form.currentPosting}
                      onChange={(e) => setForm({ ...form, currentPosting: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Supervisor Name</label>
                    <Input
                      placeholder="e.g. Lt Col Rahman"
                      value={form.supervisorName}
                      onChange={(e) => setForm({ ...form, supervisorName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Account Link & Status */}
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  System Account & Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Link User Account (Optional)</label>
                    <Select
                      value={form.userId}
                      onChange={(e) => setForm({ ...form, userId: e.target.value })}
                      options={availableUsers.map((u) => ({
                        value: u.id,
                        label: `${u.email} (${u.role})`,
                      }))}
                      placeholder="Select user account"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Status</label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      options={[
                        { value: "ACTIVE", label: "Active" },
                        { value: "ON_LEAVE", label: "On Leave" },
                        { value: "INACTIVE", label: "Inactive" },
                        { value: "RETIRED", label: "Retired" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !form.serviceId || !form.fullName || !form.rank || !form.unitId}>
                  {saving ? "Saving..." : "Create Personnel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
