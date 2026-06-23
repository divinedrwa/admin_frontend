"use client";

import { Shield, UserCheck, Users } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useConfirm } from "@/components/ConfirmDialog";
import { User, UserForm } from "@/types/user";
import { UserFormModal } from "../users/components/UserFormModal";
import { UsersTable } from "../users/components/UsersTable";
import { useUsers } from "@/hooks/useUsers";
import { useUrlPagination } from "@/hooks/useUrlPagination";

const ROLE_TABS = [
  { key: "GUARD", label: "Guards", icon: Shield },
  { key: "RESIDENT", label: "Residents", icon: Users },
  { key: "ADMIN", label: "Admins", icon: UserCheck },
] as const;

const EMPTY_FORM: UserForm = {
  username: "", name: "", email: "", phone: "", password: "",
  role: "GUARD", residentType: "OWNER", maintenanceBillingRole: "PRIMARY",
  villaId: "", unitId: "", moveInDate: new Date().toISOString().split("T")[0], isActive: true,
};

export default function RoleManagementPage() {
  return (
    <Suspense fallback={<AppShell title="Role management"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <RoleManagementPageInner />
    </Suspense>
  );
}

function RoleManagementPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeRole = (searchParams.get("role")?.toUpperCase() || "GUARD") as (typeof ROLE_TABS)[number]["key"];
  const { queryParams, handlePageChange } = useUrlPagination();
  const { data, isLoading: loading } = useUsers({ ...queryParams, role: activeRole });
  const users = data?.users ?? [];
  const pgMeta = { total: data?.total ?? 0, limit: data?.limit ?? 50, offset: data?.offset ?? 0 };

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<UserForm>({ ...EMPTY_FORM, role: activeRole });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { confirm, ConfirmUI } = useConfirm();

  const sortedUsers = useMemo(
    () => sortByVillaNumber(users, (u) => u.villa?.villaNumber ?? null),
    [users],
  );

  const setRoleTab = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", role);
    params.delete("offset");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const handleDelete = async (userId: string) => {
    if (!(await confirm({ title: "Delete user", message: "Are you sure?", confirmLabel: "Delete" }))) return;
    try {
      await api.delete(`/users/${userId}`);
      showToast("User deleted", "success");
      invalidateUsers();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to delete user").message, "error");
    }
  };

  return (
    <AppShell title="Role management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Identity & access"
          title="Role management"
          description="Browse and manage users filtered by role — guards, residents, and society admins."
          icon={<UserCheck className="h-6 w-6" />}
        />

        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeRole === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRoleTab(tab.key)}
                className={`btn ${active ? "btn-primary" : "btn-ghost"} flex items-center gap-2`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <UsersTable
          users={sortedUsers}
          loading={loading}
          residentsList={[]}
          selectedResidentIds={new Set()}
          toggleResidentSelected={() => {}}
          toggleSelectAllResidents={() => {}}
          onEdit={(user) => {
            setEditingUser(user);
            setFormData({
              username: user.username,
              name: user.name,
              email: user.email,
              phone: user.phone || "",
              password: "",
              role: user.role,
              residentType: user.residentType ?? "OWNER",
              maintenanceBillingRole: user.maintenanceBillingRole ?? "PRIMARY",
              villaId: user.villaId || "",
              unitId: user.unitId ?? user.linkedUnitId ?? "",
              moveInDate: user.moveInDate ? user.moveInDate.split("T")[0] : new Date().toISOString().split("T")[0],
              isActive: user.isActive,
            });
            setShowForm(true);
          }}
          onDelete={handleDelete}
          pgMeta={pgMeta}
          onPageChange={handlePageChange}
          hideResidentBulkSelect
        />
      </div>

      {showForm && (
        <UserFormModal
          formData={formData}
          setFormData={setFormData}
          editingUser={editingUser}
          submitting={submitting}
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            try {
              if (editingUser) {
                await api.patch(`/users/${editingUser.id}`, {
                  name: formData.name.trim(),
                  email: formData.email.trim(),
                  role: formData.role,
                  isActive: formData.isActive,
                });
                showToast("User updated", "success");
              }
              setShowForm(false);
              setEditingUser(null);
              invalidateUsers();
            } catch (error: unknown) {
              showToast(parseApiError(error, "Save failed").message, "error");
            } finally {
              setSubmitting(false);
            }
          }}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}
      {ConfirmUI}
    </AppShell>
  );
}
