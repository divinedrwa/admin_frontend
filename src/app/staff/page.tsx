"use client";

import { BriefcaseBusiness, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { VillaTypeahead } from "@/components/VillaTypeahead";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { useConfirm } from "@/components/ConfirmDialog";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useStaff } from "@/hooks/useStaff";
import { Staff, StaffForm } from "@/types/staff";

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StaffForm>({
    name: "",
    type: "MAID",
    phone: "",
    address: "",
    villaIds: []
  });
  const [submitting, setSubmitting] = useState(false);
  const { confirm, ConfirmUI } = useConfirm();

  const { data: staffData, isLoading: loading } = useStaff();
  const staff = useMemo(() => {
    const list = (staffData?.staff ?? []) as Staff[];
    return list.map((s) => ({
      ...s,
      assignments: sortByVillaNumber(
        s.assignments ?? [],
        (a) => a.villa?.villaNumber ?? null,
      ),
    }));
  }, [staffData?.staff]);

  const handleOpenForm = () => {
    setFormData({
      name: "",
      type: "MAID",
      phone: "",
      address: "",
      villaIds: []
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.villaIds.length === 0) {
      showToast("Please select at least one villa", "error");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/staff", formData);
      showToast("Staff registered successfully", "success");
      handleCloseForm();
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to register staff").message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete staff member", message: "Are you sure you want to delete this staff member?", confirmLabel: "Delete" }))) return;

    try {
      await api.delete(`/staff/${id}`);
      showToast("Staff deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to delete staff").message, "error");
    }
  };

  return (
    <AppShell title="Domestic Staff Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Household operations"
          title="Domestic staff management"
          description="Manage maids, cooks, drivers, guards, and shared staff assignments across multiple villas with clearer operational context."
          icon={<BriefcaseBusiness className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Register Staff
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Register New Staff</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Staff Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as StaffForm["type"] })
                    }
                    className="input"
                  >
                    <option value="MAID">Maid</option>
                    <option value="COOK">Cook</option>
                    <option value="DRIVER">Driver</option>
                    <option value="GUARD">Guard</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-2">
                  Assign to Villas *
                </label>
                <VillaTypeahead
                  multiple
                  value={formData.villaIds}
                  onChange={(villaIds) => setFormData((prev) => ({ ...prev, villaIds }))}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || formData.villaIds.length === 0}
                  className="btn btn-primary"
                >
                  {submitting ? "Registering..." : "Register Staff"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        <div className="table-wrapper overflow-x-auto">
          {loading ? (
            <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading staff...</p></div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th scope="col" className="table-th">Name</th>
                  <th scope="col" className="table-th">Type</th>
                  <th scope="col" className="table-th">Phone</th>
                  <th scope="col" className="table-th">Assigned Villas</th>
                  <th scope="col" className="table-th">Status</th>
                  <th scope="col" className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<BriefcaseBusiness className="h-12 w-12" />}
                        title="No staff registered"
                        description="Click &quot;Register Staff&quot; to add one."
                      />
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="table-td">{s.name}</td>
                      <td className="table-td">{s.type}</td>
                      <td className="table-td">{s.phone}</td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-1">
                          {s.assignments.filter(a => a.isActive).length === 0 ? (
                            <span className="text-fg-tertiary text-xs">No assignments</span>
                          ) : (
                            s.assignments
                              .filter(a => a.isActive)
                              .map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="badge badge-info"
                                >
                                  {assignment.villa.villaNumber}
                                </span>
                              ))
                          )}
                        </div>
                      </td>
                      <td className="table-td">
                        <span className={`badge ${s.isActive ? "badge-success" : "badge-gray"}`}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-brand-danger hover:text-denied-fg text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
