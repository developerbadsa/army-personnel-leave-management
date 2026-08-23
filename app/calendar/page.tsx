"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface CalendarItem {
  id: string;
  type: "LEAVE" | "EVENT";
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  details: Record<string, unknown>;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0).toISOString();
    try {
      const res = await fetchApi<CalendarItem[]>(`/api/calendar?start=${start}&end=${end}`);
      if (res.success && res.data) setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();

  const goNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Calendar"
        description={`${MONTHS[month]} ${year}`}
        actions={
          <div className="flex gap-1">
            <button onClick={goPrev} className="px-2 py-1 text-xs border border-slate-300 rounded-[4px] hover:bg-slate-50">← Prev</button>
            <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); }} className="px-2 py-1 text-xs border border-slate-300 rounded-[4px] hover:bg-slate-50">Today</button>
            <button onClick={goNext} className="px-2 py-1 text-xs border border-slate-300 rounded-[4px] hover:bg-slate-50">Next →</button>
          </div>
        }
      />

      {loading ? <PageLoader /> : (
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-[4px] overflow-hidden">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="bg-slate-50 p-2 text-center text-[10px] font-semibold text-slate-600 uppercase">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[80px] p-1" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const dayItems = items.filter((item) => {
              const s = new Date(item.start);
              const e = new Date(item.end);
              return date >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) &&
                     date <= new Date(e.getFullYear(), e.getMonth(), e.getDate());
            });

            return (
              <div key={day} className={`bg-white min-h-[80px] p-1 ${isToday ? "ring-2 ring-inset ring-blue-500" : ""}`}>
                <p className={`text-[10px] font-medium mb-0.5 ${isToday ? "text-blue-600 font-bold" : "text-slate-700"}`}>{day}</p>
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`text-[8px] px-1 py-0.5 rounded-[2px] mb-0.5 truncate ${
                      item.type === "LEAVE"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-4 mt-3 text-[10px]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-200 rounded-sm" /> Leave</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-200 rounded-sm" /> Event</div>
      </div>
    </DashboardLayout>
  );
}
