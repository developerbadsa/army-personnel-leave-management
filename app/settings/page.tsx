"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi, apiPatch } from "@/lib/api";
import { formatDateTime, cn } from "@/lib/utils";
import { Building2, CalendarClock, Settings, Check, type LucideIcon } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
  updatedBy?: { id: string; email: string; personnel?: { fullName: string } | null } | null;
}

interface PolicyValue {
  maxAdvanceApplicationDays: number;
  requireCommanderOrQM: boolean;
  allowWeekendOverlapCalculation: boolean;
}

interface KeyMeta {
  title: string;
  icon: LucideIcon;
}

const KEY_META: Record<string, KeyMeta> = {
  ORGANIZATION_NAME: { title: "Organization", icon: Building2 },
  LEAVE_POLICY_DEFAULTS: { title: "Leave Policy", icon: CalendarClock },
};

const DEFAULT_POLICY: PolicyValue = {
  maxAdvanceApplicationDays: 60,
  requireCommanderOrQM: true,
  allowWeekendOverlapCalculation: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable form state (initialized from the fetched values)
  const [orgName, setOrgName] = useState("");
  const [policy, setPolicy] = useState<PolicyValue>(DEFAULT_POLICY);
  const [origOrgName, setOrigOrgName] = useState("");
  const [origPolicyJson, setOrigPolicyJson] = useState("");
  const [saving, setSaving] = useState(false);

  // Fallback JSON editor for unknown / future keys
  const [editing, setEditing] = useState<Setting | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<Setting[]>("/api/settings");
      if (res.success && res.data) {
        const list = res.data;
        setSettings(list);

        const org = list.find((s) => s.key === "ORGANIZATION_NAME");
        const orgValue = org?.value && typeof org.value === "object" ? (org.value as { name?: unknown }).name : undefined;
        const orgNameText = typeof orgValue === "string" ? orgValue : "";
        setOrgName(orgNameText);
        setOrigOrgName(orgNameText);

        const pl = list.find((s) => s.key === "LEAVE_POLICY_DEFAULTS");
        const plValue = (pl?.value ?? {}) as Partial<PolicyValue>;
        const next: PolicyValue = {
          maxAdvanceApplicationDays:
            typeof plValue.maxAdvanceApplicationDays === "number" ? plValue.maxAdvanceApplicationDays : DEFAULT_POLICY.maxAdvanceApplicationDays,
          requireCommanderOrQM:
            typeof plValue.requireCommanderOrQM === "boolean" ? plValue.requireCommanderOrQM : DEFAULT_POLICY.requireCommanderOrQM,
          allowWeekendOverlapCalculation:
            typeof plValue.allowWeekendOverlapCalculation === "boolean"
              ? plValue.allowWeekendOverlapCalculation
              : DEFAULT_POLICY.allowWeekendOverlapCalculation,
        };
        setPolicy(next);
        setOrigPolicyJson(JSON.stringify(next));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const orgDirty = orgName.trim() !== origOrgName;
  const policyDirty = JSON.stringify(policy) !== origPolicyJson;

  const saveOrg = async () => {
    if (!orgName.trim() || saving) return;
    setSaving(true);
    try {
      await apiPatch("/api/settings/ORGANIZATION_NAME", { value: { name: orgName.trim() } });
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save organization name");
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    const days = Math.floor(policy.maxAdvanceApplicationDays);
    if (!Number.isFinite(days) || days < 1 || days > 365 || saving) return;
    setSaving(true);
    try {
      await apiPatch("/api/settings/LEAVE_POLICY_DEFAULTS", {
        value: {
          maxAdvanceApplicationDays: days,
          requireCommanderOrQM: policy.requireCommanderOrQM,
          allowWeekendOverlapCalculation: policy.allowWeekendOverlapCalculation,
        },
      });
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save leave policy");
    } finally {
      setSaving(false);
    }
  };

  const handleFallbackSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
      await apiPatch(`/api/settings/${editing.key}`, { value: parsed });
      setEditing(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const byKey = (key: string) => settings.find((s) => s.key === key);
  const unknownSettings = settings.filter((s) => !KEY_META[s.key]);

  return (
    <DashboardLayout>
      <PageHeader title="System Settings" description="Manage system configuration" />

      {loading ? <PageLoader /> : (
        <div className="space-y-4 max-w-2xl">
          {/* Organization */}
          {byKey("ORGANIZATION_NAME") && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[6px] bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">Organization</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {byKey("ORGANIZATION_NAME")?.description ?? "Display name of the organization"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="org-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Organization name
                  </label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Bangladesh Army"
                    maxLength={120}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Shown in the app as the organization&apos;s display name.</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <UpdatedBy setting={byKey("ORGANIZATION_NAME")} />
                  <Button size="sm" onClick={saveOrg} disabled={!orgDirty || !orgName.trim() || saving}>
                    {orgDirty ? (saving ? "Saving..." : "Save changes") : (<><Check className="w-3.5 h-3.5 mr-1" />Saved</>)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leave Policy */}
          {byKey("LEAVE_POLICY_DEFAULTS") && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[6px] bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">Leave Policy</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {byKey("LEAVE_POLICY_DEFAULTS")?.description ?? "Default leave calculation and approval rules"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-100">
                  <FieldRow label="Max advance application (days)" hint="How many days ahead a leave request may be submitted.">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={Number.isFinite(policy.maxAdvanceApplicationDays) ? policy.maxAdvanceApplicationDays : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setPolicy((p) => ({ ...p, maxAdvanceApplicationDays: raw === "" ? NaN : Number(raw) }));
                      }}
                      className="w-24 text-right"
                    />
                  </FieldRow>

                  <ToggleRow
                    label="Require Commander / Quarter Master approval"
                    hint="Approved leave must carry a Commander or Quarter Master authority."
                    checked={policy.requireCommanderOrQM}
                    onChange={(v) => setPolicy((p) => ({ ...p, requireCommanderOrQM: v }))}
                  />

                  <ToggleRow
                    label="Include weekends when calculating days"
                    hint="Weekend days count toward the total leave duration."
                    checked={policy.allowWeekendOverlapCalculation}
                    onChange={(v) => setPolicy((p) => ({ ...p, allowWeekendOverlapCalculation: v }))}
                  />
                </div>

                {Number.isFinite(policy.maxAdvanceApplicationDays) &&
                  (policy.maxAdvanceApplicationDays < 1 || policy.maxAdvanceApplicationDays > 365) && (
                    <p className="text-[10px] text-red-600 mt-1">Max advance must be between 1 and 365 days.</p>
                  )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <UpdatedBy setting={byKey("LEAVE_POLICY_DEFAULTS")} />
                  <Button
                    size="sm"
                    onClick={savePolicy}
                    disabled={
                      !policyDirty ||
                      saving ||
                      !Number.isFinite(policy.maxAdvanceApplicationDays) ||
                      policy.maxAdvanceApplicationDays < 1 ||
                      policy.maxAdvanceApplicationDays > 365
                    }
                  >
                    {policyDirty ? (saving ? "Saving..." : "Save changes") : (<><Check className="w-3.5 h-3.5 mr-1" />Saved</>)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unknown / future settings — advanced JSON editor */}
          {unknownSettings.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs font-mono font-medium text-slate-900">{s.key}</p>
                    </div>
                    {s.description && <p className="text-[10px] text-slate-500 mt-0.5">{s.description}</p>}
                    <pre className="mt-2 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-[4px] p-2 overflow-auto max-h-24">
                      {JSON.stringify(s.value, null, 2)}
                    </pre>
                    <UpdatedBy setting={s} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(s); setEditValue(JSON.stringify(s.value, null, 2)); }}>
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.key}`} maxWidth="lg">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{editing?.description}</p>
          <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={8} className="font-mono text-[11px]" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleFallbackSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function UpdatedBy({ setting }: { setting?: Setting }) {
  if (!setting) return <span className="text-[9px] text-slate-400">—</span>;
  const who = setting.updatedBy?.personnel?.fullName || setting.updatedBy?.email;
  return (
    <span className="text-[9px] text-slate-400">
      Last updated {formatDateTime(setting.updatedAt)}
      {who ? ` by ${who}` : ""}
    </span>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
          checked ? "bg-slate-900" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[19px]" : "translate-x-[3px]"
          )}
        />
      </button>
    </div>
  );
}
