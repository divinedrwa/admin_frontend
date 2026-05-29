"use client";

import { Pagination } from "@/components/Pagination";
import { User } from "@/types/user";

function isResidentLike(role: string): boolean {
  return role === "RESIDENT" || role === "ADMIN" || role === "RESIDENT_CUM_ADMIN";
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "ADMIN":
    case "RESIDENT_CUM_ADMIN":
      return "badge badge-primary";
    case "RESIDENT":
      return "badge badge-info";
    case "GUARD":
      return "badge badge-success";
    default:
      return "badge badge-gray";
  }
}

interface UsersTableProps {
  users: User[];
  loading: boolean;
  residentsList: User[];
  selectedResidentIds: Set<string>;
  toggleResidentSelected: (id: string) => void;
  toggleSelectAllResidents: () => void;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  pgMeta: { total: number; limit: number; offset: number };
  onPageChange: (offset: number) => void;
}

export function UsersTable({
  users,
  loading,
  residentsList,
  selectedResidentIds,
  toggleResidentSelected,
  toggleSelectAllResidents,
  onEdit,
  onDelete,
  pgMeta,
  onPageChange,
}: UsersTableProps) {
  if (loading) {
    return (
      <div className="table-wrapper overflow-x-auto">
        <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading users...</p></div>
      </div>
    );
  }

  return (
    <div className="table-wrapper overflow-x-auto">
      <table className="table">
        <thead className="table-head">
          <tr>
            <th scope="col" className="table-th w-10">
              {residentsList.length > 0 ? (
                <input
                  type="checkbox"
                  checked={residentsList.length > 0 && residentsList.every((r) => selectedResidentIds.has(r.id))}
                  onChange={toggleSelectAllResidents}
                  className="rounded border-surface-border"
                  aria-label="Select all residents"
                />
              ) : null}
            </th>
            <th scope="col" className="table-th">Username</th>
            <th scope="col" className="table-th">Name</th>
            <th scope="col" className="table-th">Email</th>
            <th scope="col" className="table-th">Phone</th>
            <th scope="col" className="table-th">Role</th>
            <th scope="col" className="table-th">Property</th>
            <th scope="col" className="table-th">Unit</th>
            <th scope="col" className="table-th">Maint. billing</th>
            <th scope="col" className="table-th">Status</th>
            <th scope="col" className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={11}>
                <div className="empty-state">
                  <span className="empty-state-icon">👥</span>
                  <p className="empty-state-title">No users found</p>
                  <p className="empty-state-text">Click &quot;Add User&quot; to create your first user.</p>
                </div>
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="table-row">
                <td className="table-td align-middle">
                  {isResidentLike(user.role) ? (
                    <input type="checkbox" checked={selectedResidentIds.has(user.id)} onChange={() => toggleResidentSelected(user.id)} className="rounded border-surface-border" aria-label={`Select ${user.username}`} />
                  ) : (
                    <span className="inline-block w-4" aria-hidden />
                  )}
                </td>
                <td className="table-td"><span className="font-mono text-sm text-fg-primary">{user.username || "-"}</span></td>
                <td className="table-td">{user.name}</td>
                <td className="table-td">{user.email}</td>
                <td className="table-td">{user.phone || "-"}</td>
                <td className="table-td"><span className={getRoleBadgeClass(user.role)}>{user.role}</span></td>
                <td className="table-td">{user.villa ? `${user.villa.villaNumber}` : "-"}</td>
                <td className="table-td text-xs">{isResidentLike(user.role) ? user.unit?.label ?? "—" : "—"}</td>
                <td className="table-td">{isResidentLike(user.role) ? (user.maintenanceBillingRole === "EXCLUDED" ? "Excluded" : "Primary") : "—"}</td>
                <td className="table-td"><span className={`badge ${user.isActive ? "badge-success" : "badge-gray"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(user)} className="text-brand-primary hover:text-info-fg text-xs">Edit</button>
                    <button type="button" onClick={() => onDelete(user.id)} className="text-brand-danger hover:text-denied-fg text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <Pagination total={pgMeta.total} limit={pgMeta.limit} offset={pgMeta.offset} onPageChange={onPageChange} />
    </div>
  );
}
