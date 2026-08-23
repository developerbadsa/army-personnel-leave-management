import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  ThumbsUp,
  RotateCcw,
  XCircle,
  AlertTriangle,
  CalendarCheck,
  UserCheck,
  Shield,
  Award,
} from "lucide-react";

type StatusType =
  | "APPROVED"
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "RECOMMENDED"
  | "RETURNED_FOR_CORRECTION"
  | "PENDING_FINAL_APPROVAL"
  | "REJECTED"
  | "CANCELLED"
  | "ON_LEAVE"
  | "COMPLETED"
  | "OVERDUE"
  | "NOT_STARTED"
  | "RETURNED"
  | "ACTIVE"
  | "DISABLED"
  | "ADMIN"
  | "MODERATOR"
  | "USER"
  | "COMMANDER"
  | "QUARTER_MASTER"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "APPROVED":
    case "RETURNED":
    case "ACTIVE":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{status === "APPROVED" ? "Approved" : status === "RETURNED" ? "Returned" : "Active"}</span>
        </Badge>
      );

    case "PENDING_REVIEW":
    case "UNDER_REVIEW":
      return (
        <Badge variant="warning" className={className}>
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{status === "UNDER_REVIEW" ? "Under Review" : "Pending Review"}</span>
        </Badge>
      );

    case "RECOMMENDED":
      return (
        <Badge variant="info" className={className}>
          <ThumbsUp className="w-3 h-3 text-blue-600" />
          <span>Recommended</span>
        </Badge>
      );

    case "PENDING_FINAL_APPROVAL":
      return (
        <Badge variant="purple" className={className}>
          <Award className="w-3 h-3 text-purple-600" />
          <span>Awaiting Approval</span>
        </Badge>
      );

    case "RETURNED_FOR_CORRECTION":
      return (
        <Badge variant="warning" className={className}>
          <RotateCcw className="w-3 h-3 text-orange-600" />
          <span>Correction Needed</span>
        </Badge>
      );

    case "REJECTED":
    case "CANCELLED":
    case "DISABLED":
      return (
        <Badge variant="danger" className={className}>
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>{status === "REJECTED" ? "Rejected" : status === "DISABLED" ? "Disabled" : "Cancelled"}</span>
        </Badge>
      );

    case "OVERDUE":
      return (
        <Badge variant="danger" className={className}>
          <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
          <span>Overdue</span>
        </Badge>
      );

    case "ON_LEAVE":
      return (
        <Badge variant="info" className={className}>
          <CalendarCheck className="w-3 h-3 text-blue-600" />
          <span>On Leave</span>
        </Badge>
      );

    case "ADMIN":
      return (
        <Badge variant="default" className={className}>
          <Shield className="w-3 h-3 text-slate-200" />
          <span>Admin</span>
        </Badge>
      );

    case "MODERATOR":
      return (
        <Badge variant="purple" className={className}>
          <UserCheck className="w-3 h-3 text-purple-600" />
          <span>Moderator</span>
        </Badge>
      );

    case "USER":
      return (
        <Badge variant="secondary" className={className}>
          <span>Personnel</span>
        </Badge>
      );

    case "COMMANDER":
      return (
        <Badge variant="default" className={className}>
          <Award className="w-3 h-3 text-amber-400" />
          <span>Commander</span>
        </Badge>
      );

    case "QUARTER_MASTER":
      return (
        <Badge variant="secondary" className={className}>
          <Award className="w-3 h-3 text-slate-700" />
          <span>Quarter Master</span>
        </Badge>
      );

    default:
      return (
        <Badge variant="outline" className={className}>
          <span>{status}</span>
        </Badge>
      );
  }
}
