"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/auth-provider";
import { fetchApi } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Bell, LogOut, User, ChevronDown, ShieldCheck, UserCheck } from "lucide-react";

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

  const displayName = user.personnel?.fullName || user.email.split("@")[0];
  const userPhoto = user.personnel?.photoUrl;

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-7 shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile spacer */}
      <div className="w-10 lg:hidden" />

      {/* Right */}
      <div className="flex items-center gap-3.5 ml-auto">
        {/* Notifications */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute 1.5 top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
              {userPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userPhoto}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-slate-600" />
              )}
            </div>

            {/* Name & Role */}
            <div className="hidden sm:flex flex-col items-start leading-tight text-left">
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                {displayName}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.2 rounded">
                  {user.role}
                </span>
                {user.approvalAuthority !== "NONE" && (
                  <span className="inline-flex items-center text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                    {user.approvalAuthority}
                  </span>
                )}
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
          </button>

          {/* Menu Dropdown */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile &amp; Settings
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
