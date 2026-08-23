"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { CalendarCheck, Plus } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  type: string;
  startAt: string;
  endAt: string;
  location?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "OTHER", startAt: "", endAt: "", location: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<Event[]>("/api/events");
      if (res.success && res.data) setEvents(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await apiPost("/api/events", { ...form, audienceType: "ALL" });
      setShowForm(false);
      setForm({ title: "", description: "", type: "OTHER", startAt: "", endAt: "", location: "" });
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Events"
        description="Organization events and programs"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Create Event
          </Button>
        }
      />

      {loading ? <PageLoader /> : events.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No events" description="No upcoming events." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-[4px]">{e.type}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 mb-1">{e.title}</p>
                {e.description && <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{e.description}</p>}
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>📅 {formatDate(e.startAt)} – {formatDate(e.endAt)}</p>
                  {e.location && <p>📍 {e.location}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Event" maxWidth="lg">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Title *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Type</label>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[
              { value: "TRAINING", label: "Training" },
              { value: "MEETING", label: "Meeting" },
              { value: "EXAM", label: "Exam" },
              { value: "PARADE", label: "Parade" },
              { value: "HOLIDAY", label: "Holiday" },
              { value: "PROGRAM", label: "Program" },
              { value: "OTHER", label: "Other" },
            ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Start *</label>
              <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">End *</label>
              <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Location</label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Event location" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title || !form.startAt || !form.endAt}>
              {saving ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
