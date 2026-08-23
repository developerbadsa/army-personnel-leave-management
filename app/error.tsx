"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-12 h-12 rounded-[4px] bg-rose-100 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-rose-600" />
      </div>
      <h2 className="text-base font-bold text-slate-900 mb-1">Something went wrong</h2>
      <p className="text-xs text-slate-500 max-w-sm mb-4">
        {error.message || "An unexpected error occurred while loading this section."}
      </p>
      <Button size="sm" onClick={() => reset()} className="cursor-pointer">
        <RefreshCw className="w-3.5 h-3.5 mr-1" />
        Try Again
      </Button>
    </div>
  );
}
