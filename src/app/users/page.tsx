"use client";

import { UserPlus, Users } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useConfirm } from "@/components/ConfirmDialog";
import { User, UserForm } from "@/types/user";
import { UserFormModal } from "./components/UserFormModal";
import { UsersTable } from "./components/UsersTable";
import { CsvImportExport } from "./components/CsvImportExport";
import { BulkSelectionToolbar } from "./components/BulkSelectionToolbar";
import { useUsers } from "@/hooks/useUsers";
import { useUrlPagination } from "@/hooks/useUrlPagination";

function isResidentLike(role: string): boolean {
  return role === "RESIDENT" || role === "ADMIN" || role === "RESIDENT_CUM_ADMIN";
}

const EMPTY_FORM: UserForm = {
  username: "", name: "", email: "", phone: "", password: "",
  role: "RESIDENT", residentType: "OWNER", maintenanceBillingRole: "PRIMARY",
  villaId: "", unitId: "", moveInDate: new Date().toISOString().split('T')[0], isActive: true,
};

export default function UsersPage() {
  return (
    <Suspense fallback={<AppShell title="Users Management"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const roleFilter = searchParams.get("role")?.trim() || undefined;
  const { offset, queryParams, handlePageChange } = useUrlPagination();
  const { data, isLoading: loading } = useUsers({
    ...queryParams,
    ...(roleFilter ? { role: roleFilter } : {}),
  });
  const users = data?.users ?? [];
  const pgMeta = {
    total: data?.total ?? 0,
    limit: data?.limit ?? 50,
    offset: data?.offset ?? 0,
  };

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<UserForm>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [importingResidents, setImportingResidents] = useState(false);
  const [importingGuards, setImportingGuards] = useState(false);
  const [exportingResidents, setExportingResidents] = useState(false);
  const [selectedResidentIds, setSelectedResidentIds] = useState<Set<string>>(new Set());
  const [bulkDeletingResidents, setBulkDeletingResidents] = useState(false);
  const { confirm, ConfirmUI } = useConfirm();

  const sortedUsers = useMemo(() => sortByVillaNumber(users, (u) => u.villa?.villaNumber ?? null), [users]);
  const residentsList = users.filter((u) => isResidentLike(u.role));

  const handleOpenForm = () => { setEditingUser(null); setFormData({ ...EMPTY_FORM }); setShowForm(true); };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username, name: user.name, email: user.email, phone: user.phone || "", password: "",
      role: user.role, residentType: user.residentType ?? "OWNER",
      maintenanceBillingRole: user.maintenanceBillingRole ?? "PRIMARY",
      villaId: user.villaId || "",
      unitId: user.unitId ?? user.linkedUnitId ?? "",
      moveInDate: user.moveInDate ? user.moveInDate.split("T")[0] : new Date().toISOString().split("T")[0],
      isActive: user.isActive,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setEditingUser(null); setFormData({ ...EMPTY_FORM }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const needsVilla = isResidentLike(formData.role);
    if (needsVilla && !formData.villaId) { showToast("Please select a property (villa)", "error"); return; }
    const unitIdForPayload = formData.unitId.trim();
    if (needsVilla && formData.villaId && !unitIdForPayload) { showToast("Please select an occupant unit (Ground floor, First floor, or another unit).", "error"); return; }
    if (!editingUser && !formData.password) { showToast("Password is required for new users", "error"); return; }

    setSubmitting(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = { name: formData.name.trim(), email: formData.email.trim(), phone: formData.phone.trim() || null, role: formData.role };
        if (formData.password.trim().length >= 8) payload.password = formData.password.trim();
        if (isResidentLike(formData.role)) {
          payload.residentType = formData.residentType; payload.villaId = formData.villaId || null;
          if (unitIdForPayload) payload.unitId = unitIdForPayload;
          payload.moveInDate = new Date(formData.moveInDate).toISOString(); payload.maintenanceBillingRole = formData.maintenanceBillingRole;
        }
        payload.isActive = formData.isActive;
        await api.patch(`/users/${editingUser.id}`, payload);
        showToast("User updated successfully", "success");
      } else {
        const payload: Record<string, unknown> = { username: formData.username.trim(), name: formData.name.trim(), email: formData.email.trim(), password: formData.password, role: formData.role };
        const trimmedPhone = formData.phone?.trim();
        if (trimmedPhone) payload.phone = trimmedPhone;
        if (isResidentLike(formData.role)) {
          payload.residentType = formData.residentType; payload.villaId = formData.villaId;
          payload.unitId = unitIdForPayload; payload.moveInDate = new Date(formData.moveInDate).toISOString();
          payload.maintenanceBillingRole = formData.maintenanceBillingRole;
        }
        await api.post("/users", payload);
        showToast("User created successfully", "success");
      }
      handleCloseForm();
      invalidateUsers();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; issues?: { path: (string | number)[]; message: string }[] } } })?.response?.data;
      const fromIssues = data?.issues?.length ? data.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") : undefined;
      showToast(fromIssues ?? data?.message ?? (editingUser ? "Failed to update user" : "Failed to create user"), "error");
    } finally { setSubmitting(false); }
  };

  const handleExportResidentsCsv = async () => {
    setExportingResidents(true);
    try {
      const { data } = await api.get<Blob>("/export/residents-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a"); a.href = url; a.download = `residents-export-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      showToast("Residents exported", "success");
    } catch (error: unknown) { showToast(parseApiError(error, "Export failed").message, "error"); }
    finally { setExportingResidents(false); }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>, type: "residents" | "guards") => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { showToast("Please choose a .csv file", "error"); return; }
    const setImporting = type === "residents" ? setImportingResidents : setImportingGuards;
    const endpoint = type === "residents" ? "/import/residents-csv" : "/import/guards-csv";
    setImporting(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post<{ created: number; skipped: number; errors: { line: number; message: string }[]; villasAutoCreated?: number }>(endpoint, fd);
      const villaPart = type === "residents" && data.villasAutoCreated != null && data.villasAutoCreated > 0 ? ` (${data.villasAutoCreated} villa(s) auto-created)` : "";
      showToast(`Imported ${data.created} ${type === "residents" ? "resident" : "guard"}(s)${villaPart}. Skipped ${data.skipped}.`, data.errors?.length ? "error" : "success");
      if (data.errors?.length) {
        const preview = data.errors.slice(0, 5).map((x) => `Line ${x.line}: ${x.message}`).join("; ");
        showToast(preview + (data.errors.length > 5 ? ` … and ${data.errors.length - 5} more` : ""), "error");
      }
      invalidateUsers();
    } catch (error: unknown) { showToast(parseApiError(error, "Import failed").message, "error"); }
    finally { setImporting(false); }
  };

  const toggleResidentSelected = (id: string) => {
    setSelectedResidentIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAllResidents = () => {
    const ids = residentsList.map((r) => r.id);
    setSelectedResidentIds(ids.length > 0 && ids.every((id) => selectedResidentIds.has(id)) ? new Set() : new Set(ids));
  };

  const handleDelete = async (userId: string) => {
    if (!(await confirm({ title: "Delete user", message: "Are you sure you want to delete this user?", confirmLabel: "Delete" }))) return;
    try {
      await api.delete(`/users/${userId}`);
      showToast("User deleted successfully", "success");
      setSelectedResidentIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
      invalidateUsers();
    } catch (error: unknown) { showToast(parseApiError(error, "Failed to delete user").message, "error"); }
  };

  const handleBulkDeleteResidents = async () => {
    const ids = Array.from(selectedResidentIds);
    if (ids.length === 0) return;
    if (!(await confirm({ title: "Delete selected residents", message: `Permanently delete ${ids.length} resident account(s)? This cannot be undone.`, confirmLabel: "Delete" }))) return;
    setBulkDeletingResidents(true);
    let deleted = 0; const failures: string[] = [];
    for (const id of ids) {
      try { await api.delete(`/users/${id}`); deleted++; }
      catch (error: unknown) { failures.push(`${users.find((u) => u.id === id)?.username ?? id}: ${parseApiError(error, "Delete failed").message}`); }
    }
    setSelectedResidentIds(new Set()); invalidateUsers(); setBulkDeletingResidents(false);
    if (failures.length === 0) { showToast(`Deleted ${deleted} resident(s)`, "success"); }
    else { showToast(`Deleted ${deleted}. ${failures.length} failed.`, "error"); showToast(failures.slice(0, 5).join("; ") + (failures.length > 5 ? ` … and ${failures.length - 5} more` : ""), "error"); }
  };

  return (
    <AppShell title="Users Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Identity & access"
          title="Users management"
          description="Manage admins, residents, and guards from one control point, including CSV imports, exports, and role-specific onboarding."
          icon={<Users className="h-6 w-6" />}
          actions={<button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2"><UserPlus className="h-4 w-4" />Add User</button>}
        />

        <CsvImportExport
          hasResidents={users.some((u) => isResidentLike(u.role))}
          exportingResidents={exportingResidents}
          importingResidents={importingResidents}
          importingGuards={importingGuards}
          onExportResidents={handleExportResidentsCsv}
          onImportResidents={(e) => handleCsvImport(e, "residents")}
          onImportGuards={(e) => handleCsvImport(e, "guards")}
        />

        <BulkSelectionToolbar
          count={selectedResidentIds.size}
          deleting={bulkDeletingResidents}
          onClear={() => setSelectedResidentIds(new Set())}
          onDelete={handleBulkDeleteResidents}
        />

        {showForm && (
          <UserFormModal
            formData={formData}
            setFormData={setFormData}
            editingUser={editingUser}
            submitting={submitting}
            onSubmit={handleSubmit}
            onClose={handleCloseForm}
          />
        )}

        <UsersTable
          users={sortedUsers}
          loading={loading}
          residentsList={residentsList}
          selectedResidentIds={selectedResidentIds}
          toggleResidentSelected={toggleResidentSelected}
          toggleSelectAllResidents={toggleSelectAllResidents}
          onEdit={handleEdit}
          onDelete={handleDelete}
          pgMeta={pgMeta}
          onPageChange={handlePageChange}
        />
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
