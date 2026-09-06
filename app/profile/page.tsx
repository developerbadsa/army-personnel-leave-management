"use client";

import React, { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { apiPut } from "@/lib/api";
import {
  User,
  Mail,
  Shield,
  Award,
  Calendar,
  Camera,
  Edit2,
  CheckCircle2,
  Loader2,
  Phone,
  Droplet,
  Building,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!user) return null;

  const currentPhoto = photoUrl || user.personnel?.photoUrl;
  const currentName = user.personnel?.fullName || "Topu";

  const handleStartEdit = () => {
    setFullName(user.personnel?.fullName || "");
    setPhone(user.personnel?.phone || "");
    setBloodGroup(user.personnel?.bloodGroup || "");
    setPhotoUrl(user.personnel?.photoUrl || "");
    setIsEditing(true);
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.data?.fileUrl) {
        setPhotoUrl(data.data.fileUrl);

        // Auto save photo update
        await apiPut("/api/profile", { photoUrl: data.data.fileUrl });
        if (refreshUser) await refreshUser();
        setSuccessMsg("Profile photo updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Failed to upload photo");
      }
    } catch {
      setErrorMsg("Error uploading photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await apiPut("/api/profile", {
        fullName,
        phone,
        bloodGroup,
        photoUrl: photoUrl || undefined,
      });

      if (res.success) {
        if (refreshUser) await refreshUser();
        setIsEditing(false);
        setSuccessMsg("Profile information updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(res.error || "Failed to update profile");
      }
    } catch {
      setErrorMsg("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">My Profile</h1>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={handleStartEdit} className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
          )}
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-[4px] text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[4px] text-rose-800 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Profile Card */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold">Account & Personnel Information</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Top Identity & Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-[6px] bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shadow-sm">
                  {currentPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentPhoto}
                      alt={currentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-500" />
                  )}
                </div>

                {/* Photo Upload Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition shadow cursor-pointer disabled:opacity-50"
                  title="Upload / Change Photo"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">{currentName}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StatusBadge status={user.role} className="text-[10px]" />
                  {user.approvalAuthority !== "NONE" && (
                    <StatusBadge status={user.approvalAuthority} className="text-[10px]" />
                  )}
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Full Name</label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Phone Number</label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+8801XXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Blood Group</label>
                    <Input
                      type="text"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      placeholder="e.g. B+, A+, O+"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              /* Profile Details View */
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
                <InfoRow icon={<Shield className="w-3.5 h-3.5" />} label="Role" value={<StatusBadge status={user.role} className="text-[9px]" />} />
                <InfoRow icon={<Award className="w-3.5 h-3.5" />} label="Authority" value={<StatusBadge status={user.approvalAuthority} className="text-[9px]" />} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Last Login" value={formatDate(user.lastLoginAt)} />
                {user.personnel?.phone && (
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={user.personnel.phone} />
                )}
                {user.personnel?.bloodGroup && (
                  <InfoRow icon={<Droplet className="w-3.5 h-3.5" />} label="Blood Group" value={user.personnel.bloodGroup} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personnel Assignment Info */}
        {user.personnel && (
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold">Military Service Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Service ID:</span>{" "}
                <span className="font-mono font-bold text-slate-800">{user.personnel.serviceId}</span>
              </div>
              {user.personnel.unit && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">Unit:</span>{" "}
                  <span className="font-medium text-slate-800">{user.personnel.unit.name}</span>
                </div>
              )}
              {user.personnel.section && (
                <div>
                  <span className="text-slate-500">Section:</span>{" "}
                  <span className="font-medium text-slate-800">{user.personnel.section.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
