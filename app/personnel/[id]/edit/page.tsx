"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi, apiPut } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  X,
  Loader2,
} from "lucide-react";

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
  unitId: string;
  sectionId?: string | null;
  user?: { id: string } | null;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const toDateInput = (d?: string | null): string => (d ? d.slice(0, 10) : "");

export default function EditPersonnelPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [units, setUnits] = useState<Unit[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    rank: "",
    phone: "",
    email: "",
    bloodGroup: "",
    photoUrl: "",
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

  const [photoPreview, setPhotoPreview] = useState<string>("");

  const loadForm = useCallback(async () => {
    try {
      const res = await fetchApi<PersonnelProfile>(`/api/personnel/${params.id}`);
      if (!res.success || !res.data) {
        setError(res.error || "Personnel record not found");
        return;
      }
      const p = res.data;
      setForm({
        fullName: p.fullName,
        rank: p.rank,
        phone: p.phone || "",
        email: p.email || "",
        bloodGroup: p.bloodGroup || "",
        photoUrl: p.photoUrl || "",
        joiningDate: toDateInput(p.joiningDate),
        postingDate: toDateInput(p.postingDate),
        currentPosting: p.currentPosting || "",
        previousPosting: p.previousPosting || "",
        supervisorName: p.supervisorName || "",
        unitId: p.unitId,
        sectionId: p.sectionId || "",
        userId: p.user?.id || "",
        status: p.status,
      });
      setPhotoPreview(p.photoUrl || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load personnel record");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadForm();
    fetchApi<Unit[]>("/api/units").then((res) => {
      if (res.success && res.data) setUnits(res.data);
    });
    fetchApi<UserOption[]>("/api/users").then((res) => {
      if (res.success && res.data) setAvailableUsers(res.data);
    });
  }, [loadForm]);

  const selectedUnit = units.find((u) => u.id === form.unitId);
  const sections = selectedUnit?.sections || [];

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Profile picture must be a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Profile picture exceeds the 5MB limit");
      return;
    }

    // Local preview while uploading
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to upload photo");
      }
      setForm((prev) => ({ ...prev, photoUrl: data.data.fileUrl }));
      setPhotoPreview(data.data.fileUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
      setPhotoPreview(form.photoUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = () => {
    setForm((prev) => ({ ...prev, photoUrl: "" }));
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please provide a valid email address");
      return;
    }

    setSaving(true);
    try {
      await apiPut(`/api/personnel/${params.id}`, {
        fullName: form.fullName,
        rank: form.rank,
        phone: form.phone || null,
        email: form.email || null,
        bloodGroup: form.bloodGroup || null,
        photoUrl: form.photoUrl || null,
        joiningDate: form.joiningDate || null,
        postingDate: form.postingDate || null,
        currentPosting: form.currentPosting || null,
        previousPosting: form.previousPosting || null,
        supervisorName: form.supervisorName || null,
        status: form.status,
        unitId: form.unitId || undefined,
        sectionId: form.sectionId || null,
        userId: form.userId || null,
      });
      setSuccess(true);
      setTimeout(() => router.push(`/personnel/${params.id}`), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update personnel");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Edit Personnel" description="Loading personnel record..." />
      </DashboardLayout>
    );
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Personnel Updated Successfully!</h2>
          <p className="text-xs text-slate-500 mt-1">Returning to the profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  const initials = form.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || form.rank.slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <PageHeader
        title="Edit Personnel"
        description="Update personnel details and profile picture"
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

              {/* Profile Picture */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover bg-slate-100 border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                    {initials}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                  {photoPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={removePhoto} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </Button>
                  )}
                  <span className="text-[10px] text-slate-400 w-full sm:w-auto">
                    JPG / PNG / WebP · Max 5MB
                  </span>
                </div>
              </div>

              {/* Identity */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Identity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Full Name *</label>
                    <Input
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
                    <label className="text-xs font-medium text-slate-700">Previous Posting</label>
                    <Input
                      placeholder="e.g. 9 Infantry Division"
                      value={form.previousPosting}
                      onChange={(e) => setForm({ ...form, previousPosting: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
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
                        { value: "TRANSFERRED", label: "Transferred" },
                        { value: "RETIRED", label: "Retired" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push(`/personnel/${params.id}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !form.fullName || !form.rank || !form.unitId}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
