"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, User, Clock, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { parseApiError } from "@/utils/errorHandler";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: { id: string; name: string; username: string } | null;
}

interface PaginationMeta {
  total: number;
  returned: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");

  const fetchLogs = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (actionFilter) params.append("action", actionFilter);
      if (entityTypeFilter) params.append("entityType", entityTypeFilter);
      const res = await api.get(`/audit-log?${params.toString()}`, { signal });
      setLogs(res.data?.logs ?? []);
      setMeta({
        total: res.data?.total ?? 0,
        returned: res.data?.returned ?? 0,
        page: res.data?.page ?? 1,
        pageSize: res.data?.pageSize ?? 25,
        totalPages: res.data?.totalPages ?? 1,
      });
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "CanceledError") return;
      showToast(parseApiError(error, "Failed to load audit logs").message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchLogs(controller.signal);
    return () => controller.abort();
  }, [fetchLogs]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function actionBadgeColor(action: string): string {
    if (action.startsWith("DELETE") || action.startsWith("HARD_DELETE")) return "badge-danger";
    if (action.startsWith("CREATE") || action.startsWith("RESTORE")) return "badge-success";
    if (action.startsWith("ARCHIVE")) return "badge-warning";
    if (action.startsWith("IMPERSONATE")) return "badge-info";
    return "badge-secondary";
  }

  function renderMetadata(metadata: Record<string, unknown> | null) {
    if (!metadata || Object.keys(metadata).length === 0) return "—";
    return Object.entries(metadata)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
  }

  if (loading && logs.length === 0) {
    return (
      <AppShell title="Audit Log">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Audit Log">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Management"
          title="Audit Log"
          description="Track administrative actions and changes across your society."
          icon={<ClipboardCheck className="h-6 w-6" />}
        />

        {/* Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">
                <Filter className="inline h-4 w-4 mr-1" />
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="input w-full"
              >
                <option value="">All actions</option>
                <option value="CREATE_SOCIETY">Create Society</option>
                <option value="ARCHIVE_SOCIETY">Archive Society</option>
                <option value="RESTORE_SOCIETY">Restore Society</option>
                <option value="HARD_DELETE_SOCIETY">Hard Delete Society</option>
                <option value="IMPERSONATE_TENANT">Impersonate Tenant</option>
                <option value="DELETE_USER">Delete User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">Entity type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
                className="input w-full"
              >
                <option value="">All entities</option>
                <option value="Society">Society</option>
                <option value="User">User</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setActionFilter(""); setEntityTypeFilter(""); setPage(1); }}
                className="btn btn-ghost"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Time</th>
                  <th scope="col" className="table-th">Admin</th>
                  <th scope="col" className="table-th">Action</th>
                  <th scope="col" className="table-th">Entity</th>
                  <th scope="col" className="table-th">Details</th>
                  <th scope="col" className="table-th">IP</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <EmptyState
                        icon={<ClipboardCheck className="h-12 w-12" />}
                        title="No audit logs found"
                        description="Admin actions will appear here once they occur."
                      />
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="table-row">
                      <td className="table-td whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-fg-tertiary" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-fg-tertiary" />
                          <div>
                            <p className="font-medium text-fg-primary">{log.admin?.name ?? "Unknown"}</p>
                            <p className="text-xs text-fg-secondary">{log.admin?.username ?? ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className={`badge ${actionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="text-fg-primary">{log.entityType}</span>
                        {log.entityId && (
                          <p className="text-xs text-fg-secondary font-mono truncate max-w-[120px]">
                            {log.entityId}
                          </p>
                        )}
                      </td>
                      <td className="table-td text-sm text-fg-secondary max-w-[200px] truncate">
                        {renderMetadata(log.metadata)}
                      </td>
                      <td className="table-td text-xs text-fg-tertiary font-mono">
                        {log.ipAddress ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-fg-secondary">
              Showing {(meta.page - 1) * meta.pageSize + 1}–
              {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-ghost btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="btn btn-ghost btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
