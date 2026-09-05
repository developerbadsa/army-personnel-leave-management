"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/auth-provider";
import { fetchApi } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Bell, LogOut, User, ChevronDown } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const fetchCount = async () => {
      try {
        const res = await fetchApi<{ unreadCount: number }>("/api/notifications/unread-count");
        if (isMounted && res.success && res.data) {
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // silently ignore
      }
    };

    fetchCount();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
      {/* Left: spacer for mobile sidebar toggle */}
      <div className="w-10 lg:hidden" />

      {/* Right */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-[4px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-[4px] bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
              {user.personnel?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.personnel.photoUrl}
                  alt={user.personnel.fullName || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-medium text-slate-900 leading-tight">
                {user.personnel?.fullName || user.email}
              </span>
              <div className="flex items-center gap-1">
                <StatusBadge status={user.role} className="text-[9px] py-0 px-1" />
                {user.approvalAuthority !== "NONE" && (
                  <StatusBadge status={user.approvalAuthority} className="text-[9px] py-0 px-1" />
                )}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-[4px] shadow-lg z-50 py-1">
                <Link
                  href="/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  My Profile
                </Link>
                <hr className="border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
