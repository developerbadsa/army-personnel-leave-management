"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { fetchApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { FileText, Eye } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
  actor?: { email: string; role: string; personnel?: { fullName: string; rank: string } } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);
      const res = await fetchApi<AuditLog[]>(`/api/audit-logs?${params}`);
      if (res.success && res.data) {
        setLogs(res.data);
        setMeta(res.meta || { total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout>
      <PageHeader title="Audit Logs" description={`${meta.total} records`} />

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="w-48"
        />
        <Input
          placeholder="Filter by entity..."
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="w-48"
        />
      </div>

      {loading ? <PageLoader /> : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-[10px] text-slate-500">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="text-xs">{log.actor?.personnel?.fullName || log.actor?.email || "System"}</TableCell>
                  <TableCell>
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-[4px]">{log.action}</span>
                  </TableCell>
                  <TableCell className="text-xs">{log.entityType}{log.entityId ? ` (${log.entityId.slice(0, 8)}...)` : ""}</TableCell>
                  <TableCell className="text-[10px] text-slate-500 max-w-[200px] truncate">{log.reason || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500">Page {page} of {meta.totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!detailLog} onClose={() => setDetailLog(null)} title="Audit Log Detail" maxWidth="lg">
        {detailLog && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-500">Action:</span> <span className="font-mono font-medium">{detailLog.action}</span></div>
              <div><span className="text-slate-500">Entity:</span> <span className="font-medium">{detailLog.entityType}</span></div>
              <div><span className="text-slate-500">Actor:</span> {detailLog.actor?.personnel?.fullName || detailLog.actor?.email}</div>
              <div><span className="text-slate-500">Time:</span> {formatDateTime(detailLog.createdAt)}</div>
            </div>
            {detailLog.reason && <div><span className="text-slate-500">Reason:</span> {detailLog.reason}</div>}
            {detailLog.oldValue != null && (
              <div>
                <p className="text-slate-500 mb-1">Old Value:</p>
                <pre className="bg-slate-50 border border-slate-200 rounded-[4px] p-2 overflow-auto max-h-40 text-[10px]">
                  {JSON.stringify(detailLog.oldValue ?? null, null, 2)}
                </pre>
              </div>
            )}
            {detailLog.newValue != null && (
              <div>
                <p className="text-slate-500 mb-1">New Value:</p>
                <pre className="bg-slate-50 border border-slate-200 rounded-[4px] p-2 overflow-auto max-h-40 text-[10px]">
                  {JSON.stringify(detailLog.newValue ?? null, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
