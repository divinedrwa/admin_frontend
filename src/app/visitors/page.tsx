"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { DoorOpen, UserPlus, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Pagination } from "@/components/Pagination";
import { VillaTypeahead } from "@/components/VillaTypeahead";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useConfirm } from "@/components/ConfirmDialog";
import { useVisitors } from "@/hooks/useVisitors";
import { useGates } from "@/hooks/useGates";
import { Visitor } from "@/types/visitor";

const PAGE_LIMIT = 50;

export default function VisitorsPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Visitor Management">
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10" />
          </div>
        </AppShell>
      }
    >
      <VisitorsPageInner />
    </Suspense>
  );
}

function VisitorsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingVisitorId, setDeletingVisitorId] = useState<string | null>(null);
  const { confirm, ConfirmUI } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const initialOffset = Number(searchParams.get("offset")) || 0;

  const visitorQueryParams = useMemo(() => {
    const p: Record<string, unknown> = {
      limit: PAGE_LIMIT,
      offset: initialOffset,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (typeFilter !== "all") p.visitorType = typeFilter;
    return p;
  }, [debouncedSearch, typeFilter, initialOffset]);

  const { data: visitorsData, isLoading: loading } = useVisitors(filter, visitorQueryParams);
  const visitors = ((visitorsData?.visitors ?? []) as Visitor[]).map((v) => ({
    ...v,
    villaVisits: sortByVillaNumber(
      v.villaVisits ?? [],
      (vv) => vv.villa?.villaNumber ?? null,
    ),
  }));

  const pgMeta = {
    total: visitorsData?.total ?? 0,
    limit: visitorsData?.limit ?? PAGE_LIMIT,
    offset: visitorsData?.offset ?? initialOffset,
  };

  const { data: gatesData } = useGates();
  const gates = gatesData?.gates ?? [];

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    purpose: "",
    visitorType: "GUEST",
    vehicleNumber: "",
    villaIds: [] as string[],
    gateId: "",
  });

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newOffset > 0) params.set("offset", String(newOffset));
    else params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.has("offset")) {
      params.delete("offset");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset page when filters change
  }, [debouncedSearch, typeFilter, filter]);

  const handleOpenForm = () => {
    setFormData({
      name: "",
      phone: "",
      purpose: "",
      visitorType: "GUEST",
      vehicleNumber: "",
      villaIds: [],
      gateId: (gates[0] as { id: string } | undefined)?.id || "",
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleDelete = async (visitorId: string) => {
    if (
      !(await confirm({
        title: "Delete visitor",
        message: "Are you sure you want to delete this visitor record? This action cannot be undone.",
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }

    setDeletingVisitorId(visitorId);
    try {
      await api.delete(`/visitors/${visitorId}`);
      showToast("Visitor record deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete visitor").message;
      showToast(message, "error");
    } finally {
      setDeletingVisitorId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.purpose) {
      showToast("Please fill all required fields", "error");
      return;
    }

    if (formData.villaIds.length === 0) {
      showToast("Please select at least one villa", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload: {
        name: string;
        phone: string;
        purpose: string;
        visitorType: string;
        villaIds: string[];
        vehicleNumber?: string;
        gateId?: string;
      } = {
        name: formData.name,
        phone: formData.phone,
        purpose: formData.purpose,
        visitorType: formData.visitorType,
        villaIds: formData.villaIds,
      };

      if (formData.vehicleNumber?.trim()) {
        payload.vehicleNumber = formData.vehicleNumber.trim();
      }
      if (formData.gateId?.trim()) {
        payload.gateId = formData.gateId.trim();
      }

      await api.post("/visitors", payload);
      showToast("Visitor checked in successfully", "success");
      handleCloseForm();
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to check in visitor").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVisitorTypeColor = (type: string) => {
    switch (type) {
      case "SERVICE_PROVIDER":
        return "bg-info-bg text-info-fg";
      case "DELIVERY":
        return "bg-info-bg text-info-fg";
      case "VENDOR":
        return "bg-pending-bg text-pending-fg";
      case "CONTRACTOR":
        return "bg-pending-bg text-pending-fg";
      case "GUEST":
        return "bg-approved-bg text-approved-fg";
      default:
        return "bg-surface-elevated text-fg-primary";
    }
  };

  const activeCount = visitors.filter((v) => !v.checkOutAt).length;

  return (
    <AppShell title="Visitor Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Entry operations"
          title="Visitor management"
          description={`Track visitor entry and exit, filter active records, and process manual check-ins with stronger operational visibility.${activeCount ? ` ${activeCount} visitor(s) are currently inside the society.` : ""}`}
          icon={<Users className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Check-In Visitor
            </button>
          }
        />

        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-sm"
                aria-label="Search visitors by name or phone"
              />
            </div>
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "active")}
                className="input text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input text-sm"
                aria-label="Filter by visitor type"
              >
                <option value="all">All Types</option>
                <option value="GUEST">Guest</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SERVICE_PROVIDER">Service Provider</option>
                <option value="CONTRACTOR">Contractor</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-fg-secondary">
            Showing {visitors.length} of {pgMeta.total} visitors
          </div>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-brand-primary" />
                <h2 className="text-xl font-bold text-fg-primary">Check-In Visitor</h2>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Visitor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Enter visitor name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Visiting Villas *
                  </label>
                  <VillaTypeahead
                    multiple
                    value={formData.villaIds}
                    onChange={(villaIds) => setFormData({ ...formData, villaIds })}
                    placeholder="Search villas to add…"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Visitor Type *
                    </label>
                    <select
                      value={formData.visitorType}
                      onChange={(e) => setFormData({ ...formData, visitorType: e.target.value })}
                      className="input"
                    >
                      <option value="GUEST">Guest</option>
                      <option value="DELIVERY">Delivery</option>
                      <option value="SERVICE_PROVIDER">Service Provider</option>
                      <option value="VENDOR">Vendor</option>
                      <option value="CONTRACTOR">Contractor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">Gate</label>
                    <select
                      value={formData.gateId}
                      onChange={(e) => setFormData({ ...formData, gateId: e.target.value })}
                      className="input"
                    >
                      <option value="">Select gate (optional)</option>
                      {gates.map((gate) => (
                        <option key={gate.id} value={gate.id}>
                          {gate.name} - {gate.location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Purpose *</label>
                  <input
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="input"
                    placeholder="e.g., Personal visit, Delivery, Maintenance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="input"
                    placeholder="e.g., MH01AB1234"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? "Checking In..." : "Check-In Visitor"}
                  </button>
                  <button type="button" onClick={handleCloseForm} className="btn btn-ghost">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="table-wrapper overflow-x-auto">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading visitors...</p>
            </div>
          ) : visitors.length === 0 && pgMeta.total === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">👋</span>
              <p className="empty-state-title">
                {searchQuery || typeFilter !== "all" ? "No matches" : "No visitors yet"}
              </p>
              <p className="empty-state-text">
                {searchQuery || typeFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : 'Click "Check-In Visitor" to log the first entry.'}
              </p>
            </div>
          ) : (
            <>
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th scope="col" className="table-th">Name</th>
                    <th scope="col" className="table-th">Type</th>
                    <th scope="col" className="table-th">Visiting Villas</th>
                    <th scope="col" className="table-th">Gate</th>
                    <th scope="col" className="table-th">Vehicle</th>
                    <th scope="col" className="table-th">Purpose</th>
                    <th scope="col" className="table-th">Check In</th>
                    <th scope="col" className="table-th">Check Out</th>
                    <th scope="col" className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-td text-center text-fg-secondary">
                        No visitors on this page — try another page or adjust filters.
                      </td>
                    </tr>
                  ) : (
                    visitors.map((visitor) => (
                      <tr key={visitor.id} className="table-row">
                        <td className="table-td">
                          <div>
                            <div className="font-medium">{visitor.name}</div>
                            <div className="text-xs text-fg-secondary mt-0.5">{visitor.phone}</div>
                          </div>
                        </td>
                        <td className="table-td">
                          <span className={`badge ${getVisitorTypeColor(visitor.visitorType)}`}>
                            {visitor.visitorType.replace("_", " ")}
                          </span>
                        </td>
                        <td className="table-td text-sm">
                          {visitor.villaVisits.map((vv, idx) => (
                            <div key={idx}>
                              {vv.villa.villaNumber} {vv.villa.block && `- ${vv.villa.block}`}
                            </div>
                          ))}
                        </td>
                        <td className="table-td text-fg-secondary">{visitor.gate?.name || "-"}</td>
                        <td className="table-td text-fg-secondary">{visitor.vehicleNumber || "-"}</td>
                        <td className="table-td text-fg-secondary max-w-xs truncate">{visitor.purpose}</td>
                        <td className="table-td text-fg-secondary">{formatDateTime(visitor.checkInAt)}</td>
                        <td className="table-td">
                          {visitor.checkOutAt ? (
                            <span className="text-fg-secondary">{formatDateTime(visitor.checkOutAt)}</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </td>
                        <td className="table-td">
                          <button
                            onClick={() => handleDelete(visitor.id)}
                            disabled={deletingVisitorId === visitor.id}
                            className="btn btn-ghost text-brand-danger p-1.5 disabled:opacity-50"
                            title="Delete visitor record"
                            aria-label={`Delete visitor ${visitor.name}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination
                total={pgMeta.total}
                limit={pgMeta.limit}
                offset={pgMeta.offset}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
