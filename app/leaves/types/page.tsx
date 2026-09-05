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
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  FileCheck,
  Paperclip,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
    name: "",
    code: "",
    description: "",
    defaultAllowance: 0,
    minDays: 0,
    maxDays: 0,
    requiresAttachment: false,
    allowHalfDay: false,
    allowBackdated: false,
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      description: "",
      defaultAllowance: 30,
      minDays: 1,
      maxDays: 30,
      requiresAttachment: false,
      allowHalfDay: false,
      allowBackdated: false,
    });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (t: LeaveType) => {
    setEditing(t);
    setForm({
      name: t.name,
      code: t.code,
      description: t.description || "",
      defaultAllowance: t.defaultAllowance || 0,
      minDays: t.minDays || 0,
      maxDays: t.maxDays || 0,
      requiresAttachment: t.requiresAttachment,
      allowHalfDay: t.allowHalfDay,
      allowBackdated: t.allowBackdated,
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
      setFormError(err instanceof Error ? err.message : "Failed to save leave type");
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
      alert(err instanceof Error ? err.message : "Failed to delete leave type");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Types"
        description="Configure and manage leave categories, limits, and policy requirements"
        actions={
          <Button size="sm" onClick={openCreate} className="gap-1.5 shadow-xs">
            <Plus className="w-4 h-4" /> Add Leave Type
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((t) => (
            <Card
              key={t.id}
              className={`border border-slate-200/90 rounded-lg shadow-xs hover:shadow-sm transition-all duration-150 ${
                !t.isActive ? "opacity-60 bg-slate-50/50" : "bg-white"
              }`}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                        {t.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{t.name}</h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t)}
                        className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title="Edit Type"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(t)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete Type"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Info Metrics */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Default Allowance
                    </span>
                    <span className="font-bold text-slate-800">
                      {t.defaultAllowance || 0} Days / yr
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Duration Range
                    </span>
                    <span className="font-medium text-slate-700">
                      {t.minDays || 1}d – {t.maxDays || 30}d
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {t.requiresAttachment && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded">
                        <Paperclip className="w-2.5 h-2.5" /> Doc Required
                      </span>
                    )}
                    {t.allowHalfDay && (
                      <span className="inline-flex items-center text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                        Half Day
                      </span>
                    )}
                    {t.allowBackdated && (
                      <span className="inline-flex items-center text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                        Backdated
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ml-auto ${
                        t.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {t.isActive ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-2.5 h-2.5" /> Inactive
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Leave Type" : "Create Leave Type"}
      >
        <div className="space-y-3">
          {formError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-200">
              {formError}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Annual Leave"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Code * (UPPERCASE)</label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. ANNUAL"
              disabled={!!editing}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of this leave category..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Default Allowance</label>
              <Input
                type="number"
                value={form.defaultAllowance}
                onChange={(e) =>
                  setForm({ ...form, defaultAllowance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Min Days</label>
              <Input
                type="number"
                value={form.minDays}
                onChange={(e) => setForm({ ...form, minDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Max Days</label>
              <Input
                type="number"
                value={form.maxDays}
                onChange={(e) => setForm({ ...form, maxDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresAttachment}
                onChange={(e) => setForm({ ...form, requiresAttachment: e.target.checked })}
                className="rounded text-slate-900"
              />
              Requires Document Attachment (Medical/Official)
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowHalfDay}
                onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })}
                className="rounded text-slate-900"
              />
              Allow Half-Day Applications
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowBackdated}
                onChange={(e) => setForm({ ...form, allowBackdated: e.target.checked })}
                className="rounded text-slate-900"
              />
              Allow Backdated Applications
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Leave Type"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Existing requests using this type may be affected.`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </DashboardLayout>
  );
}
