"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { fetchApi, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import Link from "next/link";
import {
  ArrowLeft, ThumbsUp, XCircle, RotateCcw, CheckCircle2, Clock, Award, FileText, Eye,
} from "lucide-react";

interface LeaveDetail {
  id: string;
  requestNumber: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
  contactDuringLeave?: string;
  addressDuringLeave?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  submittedAt?: string;
  recommendedAt?: string;
  finalApprovedAt?: string;
  correctionCount: number;
  personnel: {
    id: string;
    fullName: string;
    serviceId: string;
    rank: string;
    unit: { name: string };
    section?: { name: string } | null;
    user?: { id: string; email: string } | null;
  };
  leaveType: { name: string; code: string };
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
  }>;
  reviews: Array<{
    id: string;
    decision: string;
    remarks?: string;
    createdAt: string;
    reviewer: { email: string; role: string };
  }>;
  approvals: Array<{
    id: string;
    decision: string;
    authority: string;
    remarks?: string;
    approvedAt: string;
    approver: { email: string; approvalAuthority: string };
  }>;
  returnRecord?: {
    id: string;
    expectedReturnDate: string;
    actualReturnDate?: string;
    status: string;
  } | null;
}

export default function LeaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [leave, setLeave] = useState<LeaveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<"review" | "approve" | null>(null);
  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [acting, setActing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchLeave = useCallback(async () => {
    try {
      const res = await fetchApi<LeaveDetail>(`/api/leaves/${params.id}`);
      if (res.success && res.data) setLeave(res.data);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchLeave(); }, [fetchLeave]);

  const performAction = async () => {
    if (!actionModal || !decision) return;
    setActing(true);
    try {
      const url = actionModal === "review"
        ? `/api/leaves/${params.id}/review`
        : `/api/leaves/${params.id}/approve`;
      await apiPost(url, { decision, remarks: remarks || null });
      setActionModal(null);
      setDecision("");
      setRemarks("");
      fetchLeave();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;
  if (!leave) return <DashboardLayout><p className="text-sm text-slate-500">Leave request not found</p></DashboardLayout>;

  const imageAttachments = (leave.attachments ?? []).filter((a) => isImageAttachment(a));

  const canReview = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const canApprove = user?.approvalAuthority === "COMMANDER" || user?.approvalAuthority === "QUARTER_MASTER" || user?.role === "ADMIN";
  const isPendingReview = ["PENDING_REVIEW", "UNDER_REVIEW"].includes(leave.status);
  const isPendingApproval = leave.status === "PENDING_FINAL_APPROVAL";

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{leave.requestNumber}</h1>
              <StatusBadge status={leave.status} />
            </div>
            <p className="text-xs text-slate-500">
              {leave.personnel.fullName} ({leave.personnel.serviceId})
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase">Leave Type</p>
              <p className="text-sm font-bold mt-0.5">{leave.leaveType.name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase">Dates</p>
              <p className="text-xs font-medium mt-0.5">{formatDate(leave.startDate)}</p>
              <p className="text-[10px] text-slate-400">to {formatDate(leave.endDate)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase">Total Days</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{Number(leave.totalDays)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase">Unit</p>
              <p className="text-sm font-medium mt-0.5">{leave.personnel.unit.name}</p>
              {leave.personnel.section && (
                <p className="text-[10px] text-slate-400">{leave.personnel.section.name}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reason */}
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Reason</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-slate-700 whitespace-pre-wrap">{leave.reason}</p>
          </CardContent>
        </Card>

        {/* Attachments */}
        {leave.attachments && leave.attachments.length > 0 && (
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Attachments</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {leave.attachments.map((att) => {
                  const isImage = isImageAttachment(att);
                  if (!isImage) {
                    return (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[4px] text-xs text-slate-700 transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{att.fileName}</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-semibold shrink-0 ml-2">View / Open ↗</span>
                      </a>
                    );
                  }
                  const idx = imageAttachments.findIndex((a) => a.id === att.id);
                  return (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[4px] text-xs text-slate-700 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="w-10 h-10 rounded-[4px] object-cover bg-slate-200 border border-slate-200 shrink-0"
                        />
                        <div className="truncate">
                          <p className="truncate font-medium">{att.fileName}</p>
                          <p className="text-[9px] text-slate-400">Click image to preview</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold shrink-0 ml-2">
                        <Eye className="w-3 h-3" /> Preview
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Timeline */}
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Approval Timeline</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              <TimelineStep
                icon={<Clock className="w-3.5 h-3.5" />}
                title="Submitted"
                date={leave.submittedAt}
                color="slate"
              />
              {leave.reviews.map((r) => (
                <TimelineStep
                  key={r.id}
                  icon={<ThumbsUp className="w-3.5 h-3.5" />}
                  title={`Review: ${r.decision}`}
                  date={r.createdAt}
                  remarks={r.remarks}
                  actor={r.reviewer.email}
                  color={r.decision === "RECOMMEND" ? "blue" : r.decision === "REJECT" ? "rose" : "amber"}
                />
              ))}
              {leave.approvals.map((a) => (
                <TimelineStep
                  key={a.id}
                  icon={<Award className="w-3.5 h-3.5" />}
                  title={`${a.authority}: ${a.decision}`}
                  date={a.approvedAt}
                  remarks={a.remarks}
                  actor={a.approver.email}
                  color={a.decision === "APPROVE" ? "emerald" : "rose"}
                />
              ))}
              {leave.returnRecord && (
                <TimelineStep
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  title={`Return: ${leave.returnRecord.status}`}
                  date={leave.returnRecord.actualReturnDate || leave.returnRecord.expectedReturnDate}
                  color={leave.returnRecord.actualReturnDate ? "emerald" : "amber"}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {(canReview && isPendingReview) && (
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Moderator Action</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => { setActionModal("review"); setDecision("RECOMMEND"); }}>
                  <ThumbsUp className="w-3.5 h-3.5" /> Recommend
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setActionModal("review"); setDecision("RETURN_FOR_CORRECTION"); }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Return for Correction
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setActionModal("review"); setDecision("REJECT"); }}>
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(canApprove && isPendingApproval) && (
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Final Approval</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => { setActionModal("approve"); setDecision("APPROVE"); }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setActionModal("approve"); setDecision("RETURN_FOR_CORRECTION"); }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Return
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { setActionModal("approve"); setDecision("REJECT"); }}>
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Preview Lightbox */}
      {lightboxIndex !== null && imageAttachments.length > 0 && (
        <ImageLightbox
          images={imageAttachments.map((a) => ({
            url: a.fileUrl,
            name: a.fileName,
            caption: `${leave.personnel.fullName} · ${leave.requestNumber}`,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal === "review" ? "Review Decision" : "Final Approval Decision"}
      >
        <div className="space-y-3">
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-[4px]">
            <p className="text-xs font-medium text-slate-900">Decision: <StatusBadge status={decision} /></p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Remarks</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionModal(null)} disabled={acting}>Cancel</Button>
            <Button onClick={performAction} disabled={acting || !decision}>
              {acting ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function isImageAttachment(att: { mimeType: string; fileName: string }): boolean {
  return (
    (att.mimeType || "").startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.fileName || "")
  );
}

function TimelineStep({
  icon,
  title,
  date,
  remarks,
  actor,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  date?: string;
  remarks?: string;
  actor?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 border-slate-300",
    blue: "bg-blue-50 text-blue-600 border-blue-300",
    amber: "bg-amber-50 text-amber-600 border-amber-300",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-300",
    rose: "bg-rose-50 text-rose-600 border-rose-300",
  };

  return (
    <div className="flex gap-3">
      <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-900">{title}</p>
        {actor && <p className="text-[10px] text-slate-500">{actor}</p>}
        {remarks && <p className="text-[10px] text-slate-600 mt-0.5 italic">&quot;{remarks}&quot;</p>}
        {date && <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(date)}</p>}
      </div>
    </div>
  );
}
