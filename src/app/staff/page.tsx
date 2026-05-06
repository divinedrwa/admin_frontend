"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

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
      .then((response) => setStaff(response.data.staff ?? []))
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
      .then((response) => setVillas(response.data.villas ?? []))
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Manage domestic staff for villas</p>
            <p className="text-sm text-gray-500">Staff can work in multiple villas</p>
          </div>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Register Staff
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Register New Staff</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as StaffForm["type"] })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="MAID">Maid</option>
                    <option value="COOK">Cook</option>
                    <option value="DRIVER">Driver</option>
                    <option value="GUARD">Guard</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Villas * (Select multiple)
                </label>
                <div className="border border-gray-300 rounded p-3 max-h-60 overflow-y-auto bg-gray-50">
                  {villas.length === 0 ? (
                    <p className="text-sm text-gray-500">No villas available</p>
                  ) : (
                    <div className="space-y-2">
                      {villas.map((villa) => (
                        <label
                          key={villa.id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.villaIds.includes(villa.id)}
                            onChange={() => toggleVilla(villa.id)}
                            className="w-4 h-4 text-blue-600"
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
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {formData.villaIds.length} villa(s)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || villas.length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Registering..." : "Register Staff"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded bg-white border border-gray-200 p-4">
          {loading ? (
            <p className="text-gray-500">Loading staff...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Assigned Villas</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No staff registered. Click "Register Staff" to add one.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">{s.name}</td>
                      <td>{s.type}</td>
                      <td>{s.phone}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {s.assignments.filter(a => a.isActive).length === 0 ? (
                            <span className="text-gray-400 text-xs">No assignments</span>
                          ) : (
                            s.assignments
                              .filter(a => a.isActive)
                              .map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                >
                                  {assignment.villa.villaNumber}
                                </span>
                              ))
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            s.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
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
