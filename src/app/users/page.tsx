"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "RESIDENT" | "GUARD";
  residentType?: "OWNER" | "TENANT" | "FAMILY_MEMBER" | null;
  villaId: string | null;
  villa?: {
    villaNumber: string;
    block: string;
  };
  moveInDate: string | null;
  isActive: boolean;
};

type Villa = {
  id: string;
  villaNumber: string;
  block: string;
  ownerName: string;
};

type UserForm = {
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "ADMIN" | "RESIDENT" | "GUARD";
  residentType: "OWNER" | "TENANT" | "FAMILY_MEMBER";
  villaId: string;
  moveInDate: string;
  isActive: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<UserForm>({
    username: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "RESIDENT",
    residentType: "OWNER",
    villaId: "",
    moveInDate: new Date().toISOString().split('T')[0],
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [importingResidents, setImportingResidents] = useState(false);
  const [importingGuards, setImportingGuards] = useState(false);
  const [exportingResidents, setExportingResidents] = useState(false);
  const [selectedResidentIds, setSelectedResidentIds] = useState<Set<string>>(new Set());
  const [bulkDeletingResidents, setBulkDeletingResidents] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    api
      .get("/users")
      .then((response) => setUsers(response.data.users ?? []))
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load users";
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
    loadUsers();
    loadVillas();
  }, []);

  const handleOpenForm = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "RESIDENT",
      residentType: "OWNER",
      villaId: "",
      moveInDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role,
      residentType: user.residentType ?? "OWNER",
      villaId: user.villaId || "",
      moveInDate: user.moveInDate
        ? user.moveInDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
      isActive: user.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "RESIDENT",
      residentType: "OWNER",
      villaId: "",
      moveInDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.role === "RESIDENT" && !formData.villaId) {
      showToast("Please select a villa for resident", "error");
      return;
    }

    if (!editingUser && !formData.password) {
      showToast("Password is required for new users", "error");
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
        };
        if (formData.password.trim().length >= 6) {
          payload.password = formData.password.trim();
        }
        if (formData.role === "RESIDENT") {
          payload.residentType = formData.residentType;
          payload.villaId = formData.villaId || null;
          payload.moveInDate = new Date(formData.moveInDate).toISOString();
        }
        payload.isActive = formData.isActive;
        await api.patch(`/users/${editingUser.id}`, payload);
        showToast("User updated successfully", "success");
      } else {
        const payload: Record<string, unknown> = {
          username: formData.username.trim(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        };

        const trimmedPhone = formData.phone?.trim();
        if (trimmedPhone) {
          payload.phone = trimmedPhone;
        }

        if (formData.role === "RESIDENT") {
          payload.residentType = formData.residentType;
          payload.villaId = formData.villaId;
          payload.moveInDate = new Date(formData.moveInDate).toISOString();
        }

        await api.post("/users", payload);
        showToast("User created successfully", "success");
      }
      handleCloseForm();
      loadUsers();
    } catch (error: unknown) {
      const data = (
        error as {
          response?: {
            data?: {
              message?: string;
              issues?: { path: (string | number)[]; message: string }[];
            };
          };
        }
      )?.response?.data;
      const fromIssues = data?.issues?.length
        ? data.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ")
        : undefined;
      const message =
        fromIssues ?? data?.message ?? (editingUser ? "Failed to update user" : "Failed to create user");
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportResidentsCsv = async () => {
    setExportingResidents(true);
    try {
      const { data } = await api.get<Blob>("/export/residents-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `residents-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Residents exported", "success");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Export failed";
      showToast(message, "error");
    } finally {
      setExportingResidents(false);
    }
  };

  const handleResidentsCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Please choose a .csv file", "error");
      return;
    }
    setImportingResidents(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{
        created: number;
        skipped: number;
        errors: { line: number; message: string }[];
        villasAutoCreated?: number;
      }>("/import/residents-csv", fd);
      const villaPart =
        data.villasAutoCreated != null && data.villasAutoCreated > 0
          ? ` (${data.villasAutoCreated} villa(s) auto-created)`
          : "";
      showToast(
        `Imported ${data.created} resident(s)${villaPart}. Skipped ${data.skipped}.`,
        data.errors?.length ? "error" : "success",
      );
      if (data.errors?.length) {
        alert(
          data.errors
            .slice(0, 8)
            .map((x) => `Line ${x.line}: ${x.message}`)
            .join("\n") + (data.errors.length > 8 ? `\n… and ${data.errors.length - 8} more` : ""),
        );
      }
      loadUsers();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import failed";
      showToast(message, "error");
    } finally {
      setImportingResidents(false);
    }
  };

  const handleGuardsCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Please choose a .csv file", "error");
      return;
    }
    setImportingGuards(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{
        created: number;
        skipped: number;
        errors: { line: number; message: string }[];
      }>("/import/guards-csv", fd);
      showToast(
        `Imported ${data.created} guard(s). Skipped ${data.skipped}.`,
        data.errors?.length ? "error" : "success",
      );
      if (data.errors?.length) {
        alert(
          data.errors
            .slice(0, 8)
            .map((x) => `Line ${x.line}: ${x.message}`)
            .join("\n") + (data.errors.length > 8 ? `\n… and ${data.errors.length - 8} more` : ""),
        );
      }
      loadUsers();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import failed";
      showToast(message, "error");
    } finally {
      setImportingGuards(false);
    }
  };

  const residentsList = users.filter((u) => u.role === "RESIDENT");

  const toggleResidentSelected = (id: string) => {
    setSelectedResidentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllResidents = () => {
    const ids = residentsList.map((r) => r.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedResidentIds.has(id));
    if (allSelected) {
      setSelectedResidentIds(new Set());
    } else {
      setSelectedResidentIds(new Set(ids));
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/users/${userId}`);
      showToast("User deleted successfully", "success");
      setSelectedResidentIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      loadUsers();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete user";
      showToast(message, "error");
    }
  };

  const handleBulkDeleteResidents = async () => {
    const ids = Array.from(selectedResidentIds);
    if (ids.length === 0) return;
    if (!confirm(`Permanently delete ${ids.length} resident account(s)? This cannot be undone.`)) {
      return;
    }
    setBulkDeletingResidents(true);
    let deleted = 0;
    const failures: string[] = [];
    for (const id of ids) {
      try {
        await api.delete(`/users/${id}`);
        deleted++;
      } catch (error: unknown) {
        const user = users.find((u) => u.id === id);
        const label = user?.username ?? id;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Delete failed";
        failures.push(`${label}: ${message}`);
      }
    }
    setSelectedResidentIds(new Set());
    loadUsers();
    setBulkDeletingResidents(false);
    if (failures.length === 0) {
      showToast(`Deleted ${deleted} resident(s)`, "success");
    } else {
      showToast(`Deleted ${deleted}. ${failures.length} failed.`, "error");
      alert(failures.slice(0, 12).join("\n") + (failures.length > 12 ? `\n… and ${failures.length - 12} more` : ""));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "RESIDENT":
        return "bg-blue-100 text-blue-800";
      case "GUARD":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AppShell title="Users Management">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Manage admins, residents, and guards</p>
          <button
            onClick={handleOpenForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add User
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">Import / export residents (CSV)</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Columns:{" "}
                  <code className="bg-white px-1 rounded text-[11px]">
                    username,name,email,password,phone,residentType,villaNumber,moveInDate
                  </code>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  residentType: OWNER, TENANT, or FAMILY_MEMBER · if villaNumber is new for this society, a villa is
                  created automatically (owner name = resident name; maintenance 0 until you edit it) · moveInDate:
                  YYYY-MM-DD · same phone can appear on multiple rows (one login per row — use unique username/email
                  each time; mobile sign-in with phone may require username/email if numbers repeat)
                </p>
                <p className="text-xs text-amber-800/90 mt-1">
                  Exports leave the password column empty for security. Add passwords before re-importing to a new
                  system.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportResidentsCsv}
                  disabled={exportingResidents || !users.some((u) => u.role === "RESIDENT")}
                  className="text-sm font-medium bg-white border border-emerald-400 text-emerald-900 px-3 py-2 rounded hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {exportingResidents ? "Exporting…" : "Export residents"}
                </button>
                <a
                  href="/samples/residents-import-sample.csv"
                  download="residents-import-sample.csv"
                  className="text-sm font-medium text-emerald-800 hover:underline text-center"
                >
                  Sample CSV
                </a>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="bg-white border border-emerald-300 text-emerald-900 px-3 py-2 rounded text-sm font-medium hover:bg-emerald-100">
                {importingResidents ? "Importing…" : "Choose residents CSV"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importingResidents}
                onChange={handleResidentsCsvImport}
              />
            </label>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">Import guards (CSV)</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Columns:{" "}
                  <code className="bg-white px-1 rounded text-[11px]">
                    username,name,email,password,phone
                  </code>
                </p>
              </div>
              <a
                href="/samples/guards-import-sample.csv"
                download="guards-import-sample.csv"
                className="text-sm font-medium text-amber-900 hover:underline shrink-0"
              >
                Sample CSV
              </a>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="bg-white border border-amber-300 text-amber-900 px-3 py-2 rounded text-sm font-medium hover:bg-amber-100">
                {importingGuards ? "Importing…" : "Choose guards CSV"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importingGuards}
                onChange={handleGuardsCsvImport}
              />
            </label>
          </div>
        </div>

        {selectedResidentIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/90 px-4 py-3">
            <span className="text-sm text-gray-800">
              {selectedResidentIds.size} resident{selectedResidentIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedResidentIds(new Set())}
                disabled={bulkDeletingResidents}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteResidents}
                disabled={bulkDeletingResidents}
                className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeletingResidents ? "Deleting…" : "Delete selected residents"}
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? "Edit user" : "Create New User"}
            </h2>
            {editingUser && (
              <p className="text-sm text-gray-600 mb-4">
                Username cannot be changed. Leave password empty to keep the current password.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    minLength={3}
                    maxLength={50}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600"
                    placeholder="johndoe123"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lowercase, no spaces</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? "New password (optional)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder={editingUser ? "Leave blank to keep current" : "Min 6 characters"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    disabled={!!editingUser}
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "ADMIN" | "RESIDENT" | "GUARD"
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="RESIDENT">Resident</option>
                    <option value="GUARD">Guard</option>
                  </select>
                  {editingUser && (
                    <p className="text-xs text-gray-500 mt-1">Role cannot be changed here.</p>
                  )}
                </div>

                {editingUser && (
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Account active</span>
                    </label>
                  </div>
                )}

                {formData.role === "RESIDENT" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resident Type *
                      </label>
                      <select
                        required
                        value={formData.residentType}
                        onChange={(e) => setFormData({ ...formData, residentType: e.target.value as any })}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="OWNER">Owner</option>
                        <option value="TENANT">Tenant</option>
                        <option value="FAMILY_MEMBER">Family Member</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Owner: Villa owner | Tenant: Renting the villa | Family: Owner's family
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assign Villa *
                      </label>
                      <select
                        required={formData.role === "RESIDENT"}
                        value={formData.villaId}
                        onChange={(e) => setFormData({ ...formData, villaId: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="">Select a villa</option>
                        {villas.map((villa) => (
                          <option key={villa.id} value={villa.id}>
                            {villa.villaNumber} {villa.block ? `(Block ${villa.block})` : ""} - {villa.ownerName}
                          </option>
                        ))}
                      </select>
                      {villas.length === 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          No villas available. Please create villas first.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Move-in Date *
                      </label>
                      <input
                        type="date"
                        required={formData.role === "RESIDENT"}
                        value={formData.moveInDate}
                        onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || (formData.role === "RESIDENT" && villas.length === 0)}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? (editingUser ? "Saving..." : "Creating...") : editingUser ? "Save changes" : "Create User"}
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

        <div className="rounded bg-white border border-gray-200 p-4 overflow-x-auto">
          {loading ? (
            <p className="text-gray-500">Loading users...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 w-10">
                    {residentsList.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={
                          residentsList.length > 0 &&
                          residentsList.every((r) => selectedResidentIds.has(r.id))
                        }
                        onChange={toggleSelectAllResidents}
                        className="rounded border-gray-300"
                        title="Select all residents"
                      />
                    ) : null}
                  </th>
                  <th className="py-2">Username</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Villa</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No users found. Click "Add User" to create your first user.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 align-middle">
                        {user.role === "RESIDENT" ? (
                          <input
                            type="checkbox"
                            checked={selectedResidentIds.has(user.id)}
                            onChange={() => toggleResidentSelected(user.id)}
                            className="rounded border-gray-300"
                            aria-label={`Select resident ${user.username}`}
                          />
                        ) : (
                          <span className="inline-block w-4" aria-hidden />
                        )}
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-sm text-gray-900">
                          {user.username || "-"}
                        </span>
                      </td>
                      <td className="py-3">{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || "-"}</td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded ${getRoleBadgeColor(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.villa ? `${user.villa.villaNumber}` : "-"}
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
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
