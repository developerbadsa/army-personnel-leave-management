"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchApi, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Shield, Plus, Pencil, Trash2, Key } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  role: string;
  approvalAuthority: string;
  status: string;
  lastLoginAt?: string;
  personnel?: { id: string; fullName: string; rank: string; serviceId: string } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "USER" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<UserRecord[]>("/api/users");
      if (res.success && res.data) setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setFormError("");
    setSaving(true);
    try {
      await apiPost("/api/users", form);
      setShowForm(false);
      setForm({ email: "", password: "", role: "USER" });
      fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiPatch(`/api/users/${userId}/role`, { role: newRole });
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleAuthorityChange = async (userId: string, authority: string) => {
    try {
      await apiPatch(`/api/users/${userId}/approval-authority`, { approvalAuthority: authority });
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDisable = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return;
    try {
      await apiPost(`/api/users/${resetTarget.id}/reset-password`, { newPassword: resetPassword });
      setResetTarget(null);
      setResetPassword("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Users"
        description="Manage system user accounts"
        actions={
          <Button size="sm" onClick={() => { setEditingUser(null); setForm({ email: "", password: "", role: "USER" }); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> Create User
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Personnel</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Authority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-xs font-medium">{u.email}</TableCell>
                <TableCell>
                  {u.personnel ? (
                    <div>
                      <p className="text-xs font-medium">{u.personnel.fullName}</p>
                      <p className="text-[10px] text-slate-500">{u.personnel.rank} · {u.personnel.serviceId}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">No personnel</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    options={[
                      { value: "USER", label: "User" },
                      { value: "MODERATOR", label: "Moderator" },
                      { value: "ADMIN", label: "Admin" },
                    ]}
                    className="w-28 h-8 text-[10px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={u.approvalAuthority}
                    onChange={(e) => handleAuthorityChange(u.id, e.target.value)}
                    options={[
                      { value: "NONE", label: "None" },
                      { value: "COMMANDER", label: "Commander" },
                      { value: "QUARTER_MASTER", label: "Quarter Master" },
                    ]}
                    className="w-32 h-8 text-[10px]"
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.status} className="text-[9px]" />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDate(u.lastLoginAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Reset Password" onClick={() => { setResetTarget(u); setResetPassword(""); }}>
                      <Key className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Disable" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create User">
        <div className="space-y-3">
          {formError && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-[4px]">{formError}</p>}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@army.local" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Password *</label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Role *</label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[
              { value: "USER", label: "User" },
              { value: "MODERATOR", label: "Moderator" },
              { value: "ADMIN", label: "Admin" },
            ]} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.email}`}>
        <div className="space-y-3">
          <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password (min 6 chars)" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={!resetPassword}>Reset Password</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDisable}
        title="Disable User"
        description={`Disable account for "${deleteTarget?.email}"? They will no longer be able to log in.`}
        confirmLabel="Disable"
      />
    </DashboardLayout>
  );
}
