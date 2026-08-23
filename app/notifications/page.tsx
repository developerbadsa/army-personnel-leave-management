"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchApi, apiPatch, apiDelete } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ notifications: Notification[] }>("/api/notifications?limit=50");
      if (res.success && res.data) setNotifications(res.data.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markAsRead = async (id: string) => {
    try {
      await apiPatch("/api/notifications", { notificationId: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* silently fail */ }
  };

  const markAllRead = async () => {
    try {
      await apiPatch("/api/notifications", { markAll: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silently fail */ }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiDelete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch { /* silently fail */ }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        actions={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <PageLoader />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors ${
                !n.isRead ? "border-l-2 border-l-blue-500 bg-blue-50/30" : ""
              }`}
            >
              <div className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-semibold ${!n.isRead ? "text-slate-900" : "text-slate-700"}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.isRead && (
                    <Button variant="ghost" size="icon" title="Mark as read" onClick={() => markAsRead(n.id)}>
                      <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  )}
                  {n.entityType && n.entityId && (
                    <Link
                      href={`/${n.entityType.toLowerCase()}s/${n.entityId}`}
                      className="text-[10px] text-blue-600 hover:underline px-1"
                    >
                      View
                    </Link>
                  )}
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteNotification(n.id)}>
                    <Trash2 className="w-3 h-3 text-slate-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
