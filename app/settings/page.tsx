"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi, apiPatch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Settings as SettingsIcon } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Setting | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<Setting[]>("/api/settings");
      if (res.success && res.data) setSettings(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(editValue); } catch { parsed = editValue; }
      await apiPatch(`/api/settings/${editing.key}`, { value: parsed });
      setEditing(null);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="System Settings" description="Manage system configuration" />

      {loading ? <PageLoader /> : (
        <div className="space-y-3 max-w-2xl">
          {settings.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-mono font-medium text-slate-900">{s.key}</p>
                    {s.description && <p className="text-[10px] text-slate-500 mt-0.5">{s.description}</p>}
                    <pre className="mt-2 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-[4px] p-2 overflow-auto max-h-24">
                      {JSON.stringify(s.value, null, 2)}
                    </pre>
                    <p className="text-[9px] text-slate-400 mt-1">Updated: {formatDateTime(s.updatedAt)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setEditValue(JSON.stringify(s.value, null, 2)); }}>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
