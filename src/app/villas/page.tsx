"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type Villa = {
  id: string;
  villaNumber: string;
  floors: number;
  area: number;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: number;
  users: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  _count: {
    users: number;
  };
};

type VillaForm = {
  villaNumber: string;
  floors: string;
  area: string;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: string;
};

export default function VillasPage() {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [formData, setFormData] = useState<VillaForm>({
    villaNumber: "",
    floors: "2",
    area: "",
    block: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    monthlyMaintenance: "5000"
  });
  const [submitting, setSubmitting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedVillaIds, setSelectedVillaIds] = useState<Set<string>>(new Set());
  const [bulkDeletingVillas, setBulkDeletingVillas] = useState(false);

  const loadVillas = () => {
    setLoading(true);
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch((error: unknown) => {
        const status = (error as any)?.response?.status;
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        
        // Only show error toast for non-auth errors
        if (status !== 401 && status !== 403) {
          showToast(message ?? "Failed to load villas", "error");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Small delay to ensure token is loaded from localStorage
    const timer = setTimeout(() => {
      loadVillas();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleOpenForm = (villa?: Villa) => {
    if (villa) {
      setEditingVilla(villa);
      setFormData({
        villaNumber: villa.villaNumber,
        floors: villa.floors.toString(),
        area: villa.area.toString(),
        block: villa.block || "",
        ownerName: villa.ownerName,
        ownerEmail: villa.ownerEmail || "",
        ownerPhone: villa.ownerPhone || "",
        monthlyMaintenance: villa.monthlyMaintenance.toString()
      });
    } else {
      setEditingVilla(null);
      setFormData({
        villaNumber: "",
        floors: "2",
        area: "",
        block: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        monthlyMaintenance: "5000"
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVilla(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        villaNumber: formData.villaNumber,
        floors: parseInt(formData.floors),
        area: parseFloat(formData.area),
        block: formData.block,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        monthlyMaintenance: parseFloat(formData.monthlyMaintenance)
      };

      if (editingVilla) {
        await api.patch(`/villas/${editingVilla.id}`, payload);
        showToast("Villa updated successfully", "success");
      } else {
        await api.post("/villas", payload);
        showToast("Villa created successfully", "success");
      }

      handleCloseForm();
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save villa";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportVillasCsv = async () => {
    setExportingCsv(true);
    try {
      const { data } = await api.get<Blob>("/export/villas-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `villas-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Villas exported", "success");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Export failed";
      showToast(message, "error");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleVillaCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Please choose a .csv file", "error");
      return;
    }
    setImportingCsv(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{
        created: number;
        skipped: number;
        errors: { line: number; message: string }[];
        usersCreated?: number;
        ownerCredentials?: Array<{
          line: number;
          username: string;
          email: string;
          temporaryPassword?: string;
        }>;
      }>("/import/villas-csv", fd);
      const ownerPart =
        data.usersCreated != null && data.usersCreated > 0
          ? ` ${data.usersCreated} owner login(s) created.`
          : "";
      showToast(
        `Imported ${data.created} villa(s).${ownerPart} Skipped ${data.skipped}.`,
        data.errors?.length ? "error" : "success",
      );
      if (data.ownerCredentials?.length) {
        const credLines = data.ownerCredentials
          .map(
            (c) =>
              `Line ${c.line}: ${c.username} / ${c.email}` +
              (c.temporaryPassword != null ? ` — temp password: ${c.temporaryPassword}` : ""),
          )
          .join("\n");
        alert(`Save these generated owner passwords:\n\n${credLines}`);
      }
      if (data.errors?.length) {
        const preview = data.errors
          .slice(0, 8)
          .map((x) => `Line ${x.line}: ${x.message}`)
          .join("\n");
        alert(
          `${preview}${data.errors.length > 8 ? `\n… and ${data.errors.length - 8} more` : ""}`,
        );
      }
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import failed";
      showToast(message, "error");
    } finally {
      setImportingCsv(false);
    }
  };

  const toggleVillaSelected = (id: string) => {
    setSelectedVillaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVillas = () => {
    const allIds = villas.map((v) => v.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedVillaIds.has(id));
    if (allSelected) {
      setSelectedVillaIds(new Set());
    } else {
      setSelectedVillaIds(new Set(allIds));
    }
  };

  const handleDelete = async (villaId: string) => {
    if (!confirm("Are you sure you want to delete this villa?")) return;

    try {
      await api.delete(`/villas/${villaId}`);
      showToast("Villa deleted successfully", "success");
      setSelectedVillaIds((prev) => {
        const next = new Set(prev);
        next.delete(villaId);
        return next;
      });
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete villa";
      showToast(message, "error");
    }
  };

  const handleBulkDeleteVillas = async () => {
    const ids = Array.from(selectedVillaIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} villa(s)? Villas with active residents cannot be removed until residents are moved out.`,
      )
    ) {
      return;
    }
    setBulkDeletingVillas(true);
    let deleted = 0;
    const failures: string[] = [];
    for (const id of ids) {
      try {
        await api.delete(`/villas/${id}`);
        deleted++;
      } catch (error: unknown) {
        const villa = villas.find((v) => v.id === id);
        const label = villa?.villaNumber ?? id;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Delete failed";
        failures.push(`${label}: ${message}`);
      }
    }
    setSelectedVillaIds(new Set());
    loadVillas();
    setBulkDeletingVillas(false);
    if (failures.length === 0) {
      showToast(`Deleted ${deleted} villa(s)`, "success");
    } else {
      showToast(`Deleted ${deleted}. ${failures.length} failed.`, "error");
      alert(failures.slice(0, 12).join("\n") + (failures.length > 12 ? `\n… and ${failures.length - 12} more` : ""));
    }
  };

  return (
    <AppShell title="Villas Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Manage society villas and residents</p>
            <p className="text-sm text-gray-500">Total: {villas.length} villas</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Villa
          </button>
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Import / export villas (CSV)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Header row required:{" "}
                <code className="text-xs bg-white px-1 rounded">
                  villaNumber,floors,area,block,ownerName,ownerEmail,ownerPhone,monthlyMaintenance
                </code>
                . Optional:{" "}
                <code className="text-xs bg-white px-1 rounded">ownerUsername,ownerPassword</code> — when{" "}
                <code className="text-xs bg-white px-1 rounded">ownerEmail</code> is set, an owner resident account is
                created for this society (username from email if omitted; password generated unless{" "}
                <code className="text-xs bg-white px-1 rounded">ownerPassword</code> is at least 6 characters).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleExportVillasCsv}
                disabled={exportingCsv || villas.length === 0}
                className="text-sm font-medium bg-white border border-indigo-300 text-indigo-900 px-3 py-2 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {exportingCsv ? "Exporting…" : "Export villas CSV"}
              </button>
              <a
                href="/samples/villas-import-sample.csv"
                download="villas-import-sample.csv"
                className="text-sm font-medium text-indigo-700 hover:underline whitespace-nowrap"
              >
                Sample CSV
              </a>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="bg-white border border-indigo-300 text-indigo-800 px-3 py-2 rounded text-sm font-medium hover:bg-indigo-100">
              {importingCsv ? "Importing…" : "Choose CSV file"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importingCsv}
              onChange={handleVillaCsvImport}
            />
          </label>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingVilla ? "Edit Villa" : "Create New Villa"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Villa Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.villaNumber}
                    onChange={(e) => setFormData({ ...formData, villaNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., V-001, V-002"
                    disabled={!!editingVilla}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floors *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.floors}
                    onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block
                  </label>
                  <input
                    type="text"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., A, B, C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area (sq. ft.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Maintenance (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.monthlyMaintenance}
                    onChange={(e) => setFormData({ ...formData, monthlyMaintenance: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Owner Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner Email
                    </label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="owner@example.com"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? "Saving..." : editingVilla ? "Update Villa" : "Create Villa"}
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

        {selectedVillaIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/90 px-4 py-3">
            <span className="text-sm text-gray-800">
              {selectedVillaIds.size} villa{selectedVillaIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedVillaIds(new Set())}
                disabled={bulkDeletingVillas}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteVillas}
                disabled={bulkDeletingVillas}
                className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeletingVillas ? "Deleting…" : "Delete selected"}
              </button>
            </div>
          </div>
        )}

        <div className="rounded bg-white border border-gray-200 p-4 overflow-x-auto">
          {loading ? (
            <p className="text-gray-500">Loading villas...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 w-10">
                    {villas.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={
                          villas.length > 0 &&
                          villas.every((v) => selectedVillaIds.has(v.id))
                        }
                        onChange={toggleSelectAllVillas}
                        className="rounded border-gray-300"
                        title="Select all villas"
                      />
                    ) : null}
                  </th>
                  <th className="py-2">Villa No.</th>
                  <th>Block</th>
                  <th>Floors</th>
                  <th>Area (sq.ft.)</th>
                  <th>Owner</th>
                  <th>Maintenance</th>
                  <th>Residents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {villas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No villas found. Click "Add Villa" to create your first villa.
                    </td>
                  </tr>
                ) : (
                  villas.map((villa) => (
                    <tr key={villa.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedVillaIds.has(villa.id)}
                          onChange={() => toggleVillaSelected(villa.id)}
                          className="rounded border-gray-300"
                          aria-label={`Select villa ${villa.villaNumber}`}
                        />
                      </td>
                      <td className="py-3 font-medium">{villa.villaNumber}</td>
                      <td>{villa.block || "-"}</td>
                      <td>{villa.floors}</td>
                      <td>{villa.area}</td>
                      <td>
                        <div>
                          <div className="font-medium">{villa.ownerName}</div>
                          {villa.ownerPhone && (
                            <div className="text-xs text-gray-500">{villa.ownerPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="font-medium text-green-600">₹{villa.monthlyMaintenance}</td>
                      <td>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {villa._count.users} active
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenForm(villa)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(villa.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </div>
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
