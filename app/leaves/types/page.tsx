"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  requiresAttachment: boolean;
  allowHalfDay: boolean;
  allowBackdated: boolean;
  defaultAllowance?: number;
  minDays?: number;
  maxDays?: number;
}

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: "", code: "", description: "", defaultAllowance: 0,
    minDays: 0, maxDays: 0, requiresAttachment: false, allowHalfDay: false, allowBackdated: false,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<LeaveType[]>("/api/leaves/types");
      if (res.success && res.data) setTypes(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "", defaultAllowance: 30, minDays: 1, maxDays: 30, requiresAttachment: false, allowHalfDay: false, allowBackdated: false });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (t: LeaveType) => {
    setEditing(t);
    setForm({
      name: t.name, code: t.code, description: t.description || "",
      defaultAllowance: t.defaultAllowance || 0, minDays: t.minDays || 0, maxDays: t.maxDays || 0,
      requiresAttachment: t.requiresAttachment, allowHalfDay: t.allowHalfDay, allowBackdated: t.allowBackdated,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError("");
    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`/api/leaves/types/${editing.id}`, form);
      } else {
        await apiPost("/api/leaves/types", form);
      }
      setShowForm(false);
      fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/leaves/types/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Types"
        description="Manage leave categories"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Add Leave Type
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map((t) => (
            <Card key={t.id} className={!t.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-mono text-slate-500">{t.code}</p>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="w-3 h-3 text-rose-500" />
                    </Button>
                  </div>
                </div>
                {t.description && <p className="text-[10px] text-slate-500 mb-2">{t.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-[4px]">Allowance: {t.defaultAllowance || 0} days</span>
                  {t.minDays && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-[4px]">Min: {t.minDays}d</span>}
                  {t.maxDays && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-[4px]">Max: {t.maxDays}d</span>}
                  {t.requiresAttachment && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-[4px]">Attachment required</span>}
                  {t.isActive ? (
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-[4px]">Active</span>
                  ) : (
                    <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-[4px]">Inactive</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Leave Type" : "Create Leave Type"}>
        <div className="space-y-3">
          {formError && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-[4px]">{formError}</p>}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Leave" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Code *</label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. ANNUAL" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Default Allowance</label>
              <Input type="number" value={form.defaultAllowance} onChange={(e) => setForm({ ...form, defaultAllowance: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Min Days</label>
              <Input type="number" value={form.minDays} onChange={(e) => setForm({ ...form, minDays: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Max Days</label>
              <Input type="number" value={form.maxDays} onChange={(e) => setForm({ ...form, maxDays: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-700">
              <input type="checkbox" checked={form.requiresAttachment} onChange={(e) => setForm({ ...form, requiresAttachment: e.target.checked })} className="rounded" />
              Requires Attachment
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-700">
              <input type="checkbox" checked={form.allowHalfDay} onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })} className="rounded" />
              Allow Half Day
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-700">
              <input type="checkbox" checked={form.allowBackdated} onChange={(e) => setForm({ ...form, allowBackdated: e.target.checked })} className="rounded" />
              Allow Backdated
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Leave Type"
        description={`Delete "${deleteTarget?.name}"? This may deactivate it if active requests reference it.`}
      />
    </DashboardLayout>
  );
}
