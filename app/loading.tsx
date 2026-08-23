import React from "react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-transparent">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
