"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, CheckCircle2, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 mx-auto rounded-[4px] bg-rose-100 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-xs text-slate-500 mb-4">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password">
            <Button variant="outline" size="sm">
              Request a new link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await apiPost("/api/auth/reset-password", { token, newPassword });
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-[4px] bg-slate-900 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Set New Password</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-[4px] shadow-sm p-6">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Password Reset!</h2>
              <p className="text-xs text-slate-500 mb-4">
                Your password has been changed. You can now sign in.
              </p>
              <Link href="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-[4px]">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">New Password</label>
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
