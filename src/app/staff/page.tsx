"use client";

import { BriefcaseBusiness, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { sortByVillaNumber } from "@/utils/villaSort";

type StaffAssignment = {
  id: string;
  villa: {
    villaNumber: string;
    block: string;
  };
  startDate: string;
  isActive: boolean;
};

type Staff = {
  id: string;
  name: string;
  type: "MAID" | "COOK" | "DRIVER" | "GUARD" | "OTHER";
  phone: string;
  isActive: boolean;
  assignments: StaffAssignment[];
};

type Villa = {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
};

type StaffForm = {
  name: string;
  type: "MAID" | "COOK" | "DRIVER" | "GUARD" | "OTHER";
  phone: string;
  address: string;
  villaIds: string[];
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<StaffForm>({
    name: "",
    type: "MAID",
    phone: "",
    address: "",
    villaIds: []
  });
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = () => {
    setLoading(true);
    api
      .get("/staff")
      .then((response) => {
        const list = (response.data.staff ?? []) as Staff[];
        setStaff(
          list.map((s) => ({
            ...s,
            assignments: sortByVillaNumber(
              s.assignments ?? [],
              (a) => a.villa?.villaNumber ?? null,
            ),
          })),
        );
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load staff";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  const loadVillas = () => {
    api
      .get("/villas")
      .then((response) =>
        setVillas(
          sortByVillaNumber(
            (response.data.villas ?? []) as Villa[],
            (v) => v.villaNumber,
          ),
        ),
      )
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load villas";
        showToast(message, "error");
      });
  };

  useEffect(() => {
    loadStaff();
    loadVillas();
  }, []);

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

  const toggleVilla = (villaId: string) => {
    setFormData(prev => ({
      ...prev,
      villaIds: prev.villaIds.includes(villaId)
        ? prev.villaIds.filter(id => id !== villaId)
        : [...prev.villaIds, villaId]
    }));
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
      loadStaff();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to register staff";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      await api.delete(`/staff/${id}`);
      showToast("Staff deleted successfully", "success");
      loadStaff();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete staff";
      showToast(message, "error");
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
                  Assign to Villas * (Select multiple)
                </label>
                <div className="border border-surface-border rounded p-3 max-h-60 overflow-y-auto bg-surface-background">
                  {villas.length === 0 ? (
                    <p className="text-sm text-fg-secondary">No villas available</p>
                  ) : (
                    <div className="space-y-2">
                      {villas.map((villa) => (
                        <label
                          key={villa.id}
                          className="flex items-center space-x-3 p-2 hover:bg-surface-elevated rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.villaIds.includes(villa.id)}
                            onChange={() => toggleVilla(villa.id)}
                            className="w-4 h-4 text-brand-primary"
                          />
                          <span className="text-sm">
                            {villa.villaNumber}
                            {villa.block ? ` (Block ${villa.block})` : ""} - {villa.ownerName}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-fg-secondary mt-1">
                  Selected: {formData.villaIds.length} villa(s)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || villas.length === 0}
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
                  <th className="table-th">Name</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Assigned Villas</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <span className="empty-state-icon">🧹</span>
                        <p className="empty-state-title">No staff registered</p>
                        <p className="empty-state-text">Click &quot;Register Staff&quot; to add one.</p>
                      </div>
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
    </AppShell>
  );
}
