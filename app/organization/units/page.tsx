"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchApi, apiPost, apiPut, apiDelete } from "@/lib/api";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  _count?: { sections: number; personnel: number };
}

const emptyUnit = { name: "", code: "", description: "" };

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState(emptyUnit);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<Unit[]>("/api/units");
      if (res.success && res.data) setUnits(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingUnit(null);
    setForm(emptyUnit);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (u: Unit) => {
    setEditingUnit(u);
    setForm({ name: u.name, code: u.code, description: u.description || "" });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError("");
    setSaving(true);
    try {
      const payload = { ...form, description: form.description || null };
      if (editingUnit) {
        await apiPut(`/api/units/${editingUnit.id}`, payload);
      } else {
        await apiPost("/api/units", payload);
      }
      setShowForm(false);
      fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/units/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Units"
        description="Manage organizational units"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Add Unit
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : units.length === 0 ? (
        <EmptyState icon={Building2} title="No units found" description="Create your first unit to get started." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Personnel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs font-medium">{u.code}</TableCell>
                <TableCell className="text-xs font-medium">{u.name}</TableCell>
                <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{u.description || "—"}</TableCell>
                <TableCell className="text-xs">{u._count?.sections || 0}</TableCell>
                <TableCell className="text-xs">{u._count?.personnel || 0}</TableCell>
                <TableCell>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-medium border ${u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUnit ? "Edit Unit" : "Create Unit"}
      >
        <div className="space-y-3">
          {formError && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-[4px]">{formError}</p>}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Unit Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HQ Battalion" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Code *</label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. HQ-BN" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingUnit ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Unit"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={deleting}
      />
    </DashboardLayout>
  );
}
