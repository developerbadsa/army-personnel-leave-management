"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { fetchApi, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

interface LeaveType {
  id: string;
  name: string;
  code: string;
}

interface LeavePolicy {
  id: string;
  leaveTypeId: string;
  allocationDays: number;
  carryForwardLimit?: number | null;
  maxConsecutiveDays?: number | null;
  requiresApproval: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  leaveType: {
    id: string;
    name: string;
    code: string;
  };
}

export default function LeavePoliciesPage() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    leaveTypeId: "",
    allocationDays: 20,
    carryForwardLimit: 5,
    maxConsecutiveDays: 14,
    effectiveFrom: new Date().toISOString().split("T")[0],
    requiresApproval: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetchApi<LeavePolicy[]>("/api/leave-policies"),
        fetchApi<LeaveType[]>("/api/leaves/types"),
      ]);
      if (pRes.success && pRes.data) setPolicies(pRes.data);
      if (tRes.success && tRes.data) setLeaveTypes(tRes.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiPost("/api/leave-policies", {
        ...form,
        allocationDays: Number(form.allocationDays),
        carryForwardLimit: form.carryForwardLimit ? Number(form.carryForwardLimit) : null,
        maxConsecutiveDays: form.maxConsecutiveDays ? Number(form.maxConsecutiveDays) : null,
      });
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Policies & Rules"
        description="Configure entitlement rules, carry forward limits, and effective dates for each leave type"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setError("");
              setForm({
                leaveTypeId: leaveTypes[0]?.id || "",
                allocationDays: 20,
                carryForwardLimit: 5,
                maxConsecutiveDays: 14,
                effectiveFrom: new Date().toISOString().split("T")[0],
                requiresApproval: true,
              });
              setModalOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Policy
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : policies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Leave Policies"
          description="Create your first leave entitlement rule policy."
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Add Policy
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Allocated Days</TableHead>
                  <TableHead>Carry Forward Max</TableHead>
                  <TableHead>Max Consecutive</TableHead>
                  <TableHead>Requires Approval</TableHead>
                  <TableHead>Effective From</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {p.leaveType.name}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Code: {p.leaveType.code}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {p.allocationDays} days/yr
                    </TableCell>
                    <TableCell>
                      {p.carryForwardLimit !== null && p.carryForwardLimit !== undefined
                        ? `${p.carryForwardLimit} days`
                        : "None"}
                    </TableCell>
                    <TableCell>
                      {p.maxConsecutiveDays ? `${p.maxConsecutiveDays} days` : "Unlimited"}
                    </TableCell>
                    <TableCell>
                      {p.requiresApproval ? (
                        <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[4px]">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-[4px]">
                          Auto-Approve
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(p.effectiveFrom)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Policy Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Leave Policy"
        description="Set entitlement rules and limits for a leave category"
      >
        <form onSubmit={handleCreatePolicy} className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[4px]">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Leave Type *</label>
            <Select
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              options={leaveTypes.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
              placeholder="Select leave type"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Allocation (Days/Year) *</label>
              <Input
                type="number"
                min={0}
                value={form.allocationDays}
                onChange={(e) => setForm({ ...form, allocationDays: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Carry Forward Limit</label>
              <Input
                type="number"
                min={0}
                value={form.carryForwardLimit}
                onChange={(e) => setForm({ ...form, carryForwardLimit: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Max Consecutive Days</label>
              <Input
                type="number"
                min={1}
                value={form.maxConsecutiveDays}
                onChange={(e) => setForm({ ...form, maxConsecutiveDays: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Effective Date *</label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || !form.leaveTypeId}>
              {saving ? "Saving..." : "Save Policy"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
