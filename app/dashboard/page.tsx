"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { fetchApi } from "@/lib/api";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading-spinner";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Clock,
  Award,
  AlertTriangle,
  CalendarCheck,
  FileText,
  Bell,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetchApi("/api/dashboard/stats");
        if (isMounted && res.success && res.data) {
          setStats(res.data as Record<string, unknown>);
        }
      } catch {
        // silently fail
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500">
            Welcome back, {user.personnel?.fullName || user.email}
          </p>
        </div>

        {loading ? (
          <PageLoader />
        ) : stats ? (
          <DashboardContent user={user} stats={stats} />
        ) : (
          <p className="text-sm text-slate-500">No data available</p>
        )}
      </div>
    </DashboardLayout>
  );
}

function DashboardContent({
  user,
  stats,
}: {
  user: { role: string; id: string };
  stats: Record<string, unknown>;
}) {
  const role = stats.role as string;
  const data = stats.stats as Record<string, unknown>;

  if (role === "ADMIN") {
    return <AdminDashboard data={data} />;
  }
  if (role === "MODERATOR") {
    return <ModeratorDashboard data={data} />;
  }
  return <UserDashboard data={data} userId={user.id} />;
}

function AdminDashboard({ data }: { data: Record<string, unknown> }) {
  const monthlyTrends = (data.monthlyTrends || []) as Array<{ month: string; count: number }>;
  const distribution = (data.leaveTypeDistribution || []) as Array<{ name: string; value: number }>;
  const COLORS = ["#0f172a", "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Personnel"
          value={data.totalPersonnel as number}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Active"
          value={data.activePersonnel as number}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="On Leave"
          value={data.onLeavePersonnel as number}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Pending Review"
          value={data.pendingReviewCount as number}
          icon={FileText}
          variant="info"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          title="Awaiting Approval"
          value={data.awaitingFinalApprovalCount as number}
          icon={Award}
          variant="purple"
        />
        <StatCard
          title="Overdue Returns"
          value={data.overdueReturnsCount as number}
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          title="Upcoming Events"
          value={data.upcomingEventsCount as number}
          icon={CalendarCheck}
          variant="info"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Monthly Leave Trends (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[220px]">
            {monthlyTrends.length === 0 ? (
              <p className="text-xs text-slate-400 text-center pt-16">No monthly data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "4px",
                      border: "none",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} name="Applications" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Leave Distribution by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[220px]">
            {distribution.length === 0 ? (
              <p className="text-xs text-slate-400 text-center pt-16">No leave data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "4px",
                      border: "none",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickLinks />
        <SystemStatus />
      </div>
    </div>
  );
}

function ModeratorDashboard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Assigned Personnel"
          value={data.assignedPersonnelCount as number}
          icon={UserCheck}
          variant="default"
        />
        <StatCard
          title="Pending Review"
          value={data.pendingReviewCount as number}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Awaiting Approval"
          value={data.awaitingFinalApprovalCount as number}
          icon={Award}
          variant="purple"
        />
        <StatCard
          title="Overdue Returns"
          value={data.overdueReturnsCount as number}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>
      <QuickLinks />
    </div>
  );
}

function UserDashboard({ data, userId }: { data: Record<string, unknown>; userId: string }) {
  const balances = (data.balances || []) as Array<{
    leaveTypeName: string;
    code: string;
    remainingDays: number;
  }>;
  const recentRequests = (data.recentRequests || []) as Array<{
    id: string;
    requestNumber: string;
    status: string;
    totalDays: number;
    createdAt: string;
    leaveType: { name: string };
  }>;
  const unreadCount = data.unreadNotificationsCount as number;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      {balances.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Leave Balance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {balances.map((b) => (
              <Card key={b.code}>
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {b.leaveTypeName}
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{b.remainingDays}</p>
                  <p className="text-[10px] text-slate-400">days left</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Requests */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {recentRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No leave requests yet</p>
            ) : (
              <div className="space-y-2">
                {recentRequests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/leaves/${r.id}`}
                    className="flex items-center justify-between p-2 rounded-[4px] hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-900">{r.requestNumber}</p>
                      <p className="text-[10px] text-slate-500">
                        {r.leaveType.name} · {r.totalDays} days
                      </p>
                    </div>
                    <StatusBadge status={r.status} className="text-[9px]" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between p-2 rounded-[4px] bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-700">Unread Notifications</span>
              </div>
              <span className="text-xs font-semibold text-slate-900">{unreadCount}</span>
            </div>
            <Link
              href="/leaves/apply"
              className="block text-center text-xs font-medium text-slate-600 hover:text-slate-900 p-2 rounded-[4px] border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Apply for Leave →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLinks() {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 grid grid-cols-2 gap-2">
        {[
          { label: "View Personnel", href: "/personnel", icon: Users },
          { label: "Leave Requests", href: "/leaves", icon: FileText },
          { label: "Calendar", href: "/calendar", icon: CalendarCheck },
          { label: "Notifications", href: "/notifications", icon: Bell },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 p-3 rounded-[4px] border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <item.icon className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">{item.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function SystemStatus() {
  const [settings, setSettings] = useState<Array<{ key: string; value: unknown }>>([]);

  useEffect(() => {
    fetchApi("/api/settings").then((res) => {
      if (res.success && res.data) {
        setSettings(res.data as Array<{ key: string; value: unknown }>);
      }
    }).catch(() => {});
  }, []);

  const orgName = settings.find((s) => s.key === "ORGANIZATION_NAME");

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-sm">System Status</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Organization</span>
          <span className="font-medium text-slate-900">
            {orgName ? String((orgName.value as Record<string, string>).name) : "Loading..."}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Status</span>
          <StatusBadge status="ACTIVE" className="text-[9px]" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Last Updated</span>
          <span className="text-slate-700">{formatDate(new Date().toISOString())}</span>
        </div>
      </CardContent>
    </Card>
  );
}
