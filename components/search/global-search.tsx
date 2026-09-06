"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Search,
  Users,
  Mail,
  ClipboardList,
  X,
  Loader2,
  ArrowRight,
  CalendarDays,
  CornerDownLeft,
} from "lucide-react";

type SearchType = "all" | "personnel" | "users" | "leaves";

interface PersonnelHit {
  id: string;
  serviceId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  status: string;
  unit: { name: string };
  section?: { name: string } | null;
  user?: { email: string } | null;
}

interface UserHit {
  id: string;
  email: string;
  role: string;
  status: string;
  personnel?: { id: string; fullName: string; serviceId: string } | null;
}

interface LeaveHit {
  id: string;
  requestNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  leaveType: { name: string };
  personnel: { id: string; fullName: string; serviceId: string };
}

interface SearchData {
  personnel: PersonnelHit[];
  users: UserHit[];
  leaves: LeaveHit[];
  totals: { personnel: number; users: number; leaves: number };
}

interface FlatRow {
  key: string;
  kind: "personnel" | "user" | "leave";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

const TYPE_TABS: { value: SearchType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "personnel", label: "Personnel" },
  { value: "users", label: "Users" },
  { value: "leaves", label: "Leave" },
];

const LEAVE_STATUS_OPTIONS = [
  "PENDING_REVIEW",
  "PENDING_FINAL_APPROVAL",
  "APPROVED",
  "REJECTED",
  "RETURNED_FOR_CORRECTION",
  "ON_LEAVE",
  "COMPLETED",
  "OVERDUE",
];

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const showLeaveFilters = type === "all" || type === "leaves";

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type !== "all") params.set("type", type);
    if (showLeaveFilters) {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status) params.set("status", status);
    }
    return params;
  }, [query, type, from, to, status, showLeaveFilters]);

  const runSearch = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      if (!qs) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchApi<SearchData>(`/api/search?${qs}`)
        .then((res) => {
          if (res.success && res.data) setData(res.data);
          else setData({ personnel: [], users: [], leaves: [], totals: { personnel: 0, users: 0, leaves: 0 } });
        })
        .catch(() => {
          setData({ personnel: [], users: [], leaves: [], totals: { personnel: 0, users: 0, leaves: 0 } });
        })
        .finally(() => setLoading(false));
    },
    []
  );

  // Debounced search whenever the params change
  useEffect(() => {
    const t = setTimeout(() => {
      const hasInput = Boolean(query.trim() || from || to || status);
      if (!hasInput) {
        setData(null);
        setLoading(false);
        setActive(0);
        return;
      }
      setActive(0);
      runSearch(searchParams);
    }, 250);
    return () => clearTimeout(t);
  }, [searchParams, query, from, to, status, runSearch]);

  // Autofocus
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape even when focus is on a filter control
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    if (!data) return out;
    for (const p of data.personnel) {
      out.push({
        key: `p-${p.id}`,
        kind: "personnel",
        title: p.fullName,
        subtitle: [p.serviceId, p.unit.name, p.section?.name, p.user?.email]
          .filter(Boolean)
          .join(" · "),
        href: `/personnel/${p.id}`,
        status: p.status,
      });
    }
    for (const u of data.users) {
      out.push({
        key: `u-${u.id}`,
        kind: "user",
        title: u.email,
        subtitle: u.personnel
          ? `${u.personnel.fullName} (${u.personnel.serviceId})`
          : `${u.role} account`,
        href: u.personnel ? `/personnel/${u.personnel.id}` : "/users",
        status: u.status,
      });
    }
    for (const l of data.leaves) {
      out.push({
        key: `l-${l.id}`,
        kind: "leave",
        title: `${l.requestNumber} — ${l.personnel.fullName}`,
        subtitle: `${l.leaveType.name} · ${formatDate(l.startDate)} → ${formatDate(l.endDate)} (${Number(l.totalDays)} day${Number(l.totalDays) === 1 ? "" : "s"}) · ${l.personnel.serviceId}`,
        href: `/leaves/${l.id}`,
        status: l.status,
      });
    }
    return out;
  }, [data]);

  const openRow = (row: FlatRow) => {
    onClose();
    router.push(row.href);
  };

  const totalHits = data
    ? data.totals.personnel + data.totals.users + data.totals.leaves
    : 0;
  const somethingSearched = Boolean(query.trim() || from || to || status);
  const noResults = !loading && somethingSearched && totalHits === 0;

  const focusRowByKey = (key: string) => {
    const idx = rows.findIndex((r) => r.key === key);
    if (idx >= 0) setActive(idx);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const row = rows[active];
      if (row) {
        e.preventDefault();
        openRow(row);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="absolute top-[12vh] left-1/2 -translate-x-1/2 w-[min(680px,calc(100vw-2rem))] rounded-[6px] border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search personnel, users, leave requests… (name, service ID, phone, request #)"
            className="flex-1 h-12 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 flex-wrap">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setType(tab.value)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-[4px] transition-colors cursor-pointer ${
                type === tab.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <kbd className="text-[9px] text-slate-400 border border-slate-200 rounded px-1 py-0.5">Esc</kbd>
        </div>

        {/* Leave date + status filters */}
        {showLeaveFilters && (
          <div className="flex items-center gap-2 px-3 pt-2 flex-wrap">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-7 text-[11px] border border-slate-200 rounded-[4px] px-2 text-slate-700 bg-white"
              title="Leave from date"
            />
            <span className="text-[10px] text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-7 text-[11px] border border-slate-200 rounded-[4px] px-2 text-slate-700 bg-white"
              title="Leave to date"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-7 text-[11px] border border-slate-200 rounded-[4px] px-1.5 text-slate-700 bg-white"
            >
              <option value="">All leave statuses</option>
              {LEAVE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto p-2" onKeyDown={onKeyDown}>
          {!somethingSearched ? (
            <div className="py-10 text-center">
              <Search className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Start typing to search across personnel, users &amp; leave requests
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-slate-400">
                <kbd className="border border-slate-200 rounded px-1 py-0.5">↑</kbd>
                <kbd className="border border-slate-200 rounded px-1 py-0.5">↓</kbd>
                <span>navigate</span>
                <kbd className="border border-slate-200 rounded px-1 py-0.5 ml-1">
                  <CornerDownLeft className="w-2.5 h-2.5 inline" />
                </kbd>
                <span>open</span>
              </div>
            </div>
          ) : loading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin mx-auto" />
            </div>
          ) : noResults ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-500">No results found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try a different name, ID, request number, date range, or status.
              </p>
            </div>
          ) : (
            <div>
              {/* Personnel */}
              {data && data.personnel.length > 0 && (
                <ResultSection label={`Personnel (${data.totals.personnel})`}>
                  {data.personnel.map((p) => (
                    <ResultRow
                      key={p.id}
                      icon={<Users className="w-4 h-4" />}
                      row={rows.find((r) => r.key === `p-${p.id}`)!}
                      activeKey={rows[active]?.key}
                      onHover={() => focusRowByKey(`p-${p.id}`)}
                      onOpen={openRow}
                    />
                  ))}
                </ResultSection>
              )}
              {/* Users */}
              {data && data.users.length > 0 && (
                <ResultSection label={`User Accounts (${data.totals.users})`}>
                  {data.users.map((u) => (
                    <ResultRow
                      key={u.id}
                      icon={<Mail className="w-4 h-4" />}
                      row={rows.find((r) => r.key === `u-${u.id}`)!}
                      activeKey={rows[active]?.key}
                      onHover={() => focusRowByKey(`u-${u.id}`)}
                      onOpen={openRow}
                    />
                  ))}
                </ResultSection>
              )}
              {/* Leaves */}
              {data && data.leaves.length > 0 && (
                <ResultSection label={`Leave Requests (${data.totals.leaves})`}>
                  {data.leaves.map((l) => (
                    <ResultRow
                      key={l.id}
                      icon={<ClipboardList className="w-4 h-4" />}
                      row={rows.find((r) => r.key === `l-${l.id}`)!}
                      activeKey={rows[active]?.key}
                      onHover={() => focusRowByKey(`l-${l.id}`)}
                      onOpen={openRow}
                    />
                  ))}
                </ResultSection>
              )}

              {data && totalHits === 0 && !noResults && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matches in the selected scope.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {somethingSearched && !loading && data && totalHits > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
            <p className="text-[10px] text-slate-400">
              {totalHits} match{totalHits === 1 ? "" : "es"}
              {totalHits > Math.max(data.personnel.length, data.users.length, data.leaves.length) &&
                " · showing top results"}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-slate-400">
              <kbd className="border border-slate-200 rounded px-1 py-0.5">Enter</kbd> to open
              <ArrowRight className="w-3 h-3 text-slate-300" />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function ResultRow({
  icon,
  row,
  activeKey,
  onHover,
  onOpen,
}: {
  icon: React.ReactNode;
  row: FlatRow;
  activeKey?: string;
  onHover: () => void;
  onOpen: (row: FlatRow) => void;
}) {
  const active = activeKey === row.key;
  return (
    <button
      onMouseEnter={onHover}
      onClick={() => onOpen(row)}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[4px] text-left transition-colors cursor-pointer ${
        active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
      }`}
    >
      <span
        className={`shrink-0 w-7 h-7 rounded-[4px] flex items-center justify-center ${
          active ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold truncate">{row.title}</span>
        <span
          className={`block text-[10px] truncate ${active ? "text-slate-300" : "text-slate-500"}`}
        >
          {row.subtitle}
        </span>
      </span>
      {row.status && (
        <StatusBadge status={row.status} className="text-[9px] shrink-0" />
      )}
    </button>
  );
}
