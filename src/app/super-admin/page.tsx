"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiSuper, SUPER_ADMIN_TOKEN_KEY } from "@/lib/apiSuper";
import { showToast } from "@/components/Toast";
import { enterPlatformView } from "@/lib/platformViewSession";
import {
  getStoredPasswordForAdmin,
  rememberSocietyAdminPassword,
} from "@/lib/superAdminStoredCredentials";

type SocietyAdminSummary = {
  id: string;
  username: string;
  email: string;
  name: string;
};

type SocietyRow = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  /** ISO timestamp when soft-archived; null when active. */
  archivedAt: string | null;
  archivedBy: string | null;
  createdAt: string;
  admins?: SocietyAdminSummary[];
};

type SocietyCounts = {
  users: number;
  villas: number;
  gates: number;
};

type SocietyDetail = SocietyRow & {
  updatedAt: string;
  createdByUserId: string | null;
  counts: SocietyCounts;
};

export default function SuperAdminConsolePage() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [societies, setSocieties] = useState<SocietyRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creatingSoc, setCreatingSoc] = useState(false);

  const [adminSocietyId, setAdminSocietyId] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [detailSociety, setDetailSociety] = useState<SocietyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openingTenantSession, setOpeningTenantSession] = useState(false);

  const [editRow, setEditRow] = useState<SocietyRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteRow, setDeleteRow] = useState<SocietyRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Typed-name confirmation field for hard-delete; matches case-insensitively. */
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  /** Bumps when sessionStorage credentials change so admin password cells re-render. */
  const [credentialRenderTick, setCredentialRenderTick] = useState(0);

  const loadSocieties = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await apiSuper.get<{ societies: SocietyRow[] }>("/super/societies");
      const list = data?.societies ?? [];
      setSocieties(list);
      setAdminSocietyId((prev) =>
        prev && list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? ""),
      );
    } catch {
      showToast("Could not load societies", "error");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(SUPER_ADMIN_TOKEN_KEY);
    if (!token) {
      router.replace("/super-admin/login");
      return;
    }
    void (async () => {
      await loadSocieties();
      setBooting(false);
    })();
  }, [router, loadSocieties]);

  function logout() {
    localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
    router.push("/super-admin/login");
  }

  async function onCreateSociety(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Society name is required", "error");
      return;
    }
    setCreatingSoc(true);
    try {
      await apiSuper.post("/super/societies", {
        name: newName.trim(),
        address: newAddress.trim() || undefined,
      });
      showToast("Society created", "success");
      setNewName("");
      setNewAddress("");
      await loadSocieties();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not create society";
      showToast(message, "error");
    } finally {
      setCreatingSoc(false);
    }
  }

  async function onCreateAdmin(e: FormEvent) {
    e.preventDefault();
    if (!adminSocietyId) {
      showToast("Select a society", "error");
      return;
    }
    setCreatingAdmin(true);
    const sid = adminSocietyId;
    const uname = adminUsername.trim();
    const pwd = adminPassword;
    try {
      await apiSuper.post(`/super/societies/${encodeURIComponent(sid)}/admins`, {
        username: uname,
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: pwd,
        phone: adminPhone.trim() || undefined,
      });
      rememberSocietyAdminPassword(sid, uname, pwd);
      setCredentialRenderTick((t) => t + 1);
      showToast("Society admin user created — they can sign in at Society Admin login.", "success");
      setAdminUsername("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminPhone("");
      await loadSocieties();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not create admin user";
      showToast(message, "error");
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function openViewDetail(s: SocietyRow) {
    setDetailLoading(true);
    setDetailSociety(null);
    try {
      const { data } = await apiSuper.get<{ society: SocietyDetail }>(
        `/super/societies/${encodeURIComponent(s.id)}`,
      );
      setDetailSociety(data.society);
    } catch {
      showToast("Could not load society details", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  async function openSocietyAdminDashboard(s: SocietyRow | SocietyDetail) {
    setOpeningTenantSession(true);
    try {
      const { data } = await apiSuper.post<{ token: string }>(
        `/super/societies/${encodeURIComponent(s.id)}/tenant-session`,
      );
      if (!data?.token) {
        showToast("No tenant token returned", "error");
        return;
      }
      enterPlatformView(data.token, s.id, s.name);
      setDetailSociety(null);
      setDetailLoading(false);
      router.push("/dashboard");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not open society admin dashboard";
      showToast(message, "error");
    } finally {
      setOpeningTenantSession(false);
    }
  }

  function openEdit(s: SocietyRow) {
    setEditRow(s);
    setEditName(s.name);
    setEditAddress(s.address ?? "");
    setEditStatus(s.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setSavingEdit(true);
    try {
      await apiSuper.patch(`/super/societies/${encodeURIComponent(editRow.id)}`, {
        name: editName.trim(),
        address: editAddress.trim() || null,
        status: editStatus,
      });
      showToast("Society updated", "success");
      setEditRow(null);
      await loadSocieties();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not update society";
      showToast(message, "error");
    } finally {
      setSavingEdit(false);
    }
  }

  /**
   * Hard delete with typed-name confirmation. The backend re-validates the
   * match — frontend disabling is just UX, the server is the source of
   * truth.
   */
  async function onConfirmDelete() {
    if (!deleteRow) return;
    if (deleteConfirmText.trim().toLowerCase() !== deleteRow.name.toLowerCase()) return;
    setDeleting(true);
    try {
      await apiSuper.delete(
        `/super/societies/${encodeURIComponent(deleteRow.id)}` +
          `?confirmHardDelete=${encodeURIComponent(deleteConfirmText.trim())}`,
      );
      showToast("Society permanently deleted", "success");
      setDeleteRow(null);
      setDeleteConfirmText("");
      await loadSocieties();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not delete society";
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  }

  /**
   * Soft archive: reversible default action. Forces status=INACTIVE on the
   * server so existing tenant logins are blocked immediately.
   */
  async function onArchive(s: SocietyRow) {
    setArchivingId(s.id);
    try {
      await apiSuper.delete(`/super/societies/${encodeURIComponent(s.id)}`);
      showToast(`Archived "${s.name}"`, "success");
      await loadSocieties();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not archive society";
      showToast(message, "error");
    } finally {
      setArchivingId(null);
    }
  }

  /** Reverse a soft-archive. Status stays INACTIVE — operator must flip
   *  it to ACTIVE explicitly via Edit before tenants can log in. */
  async function onRestore(s: SocietyRow) {
    setArchivingId(s.id);
    try {
      await apiSuper.post(`/super/societies/${encodeURIComponent(s.id)}/restore`);
      showToast(`Restored "${s.name}" — set to ACTIVE in Edit to re-enable logins`, "success");
      await loadSocieties();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not restore society";
      showToast(message, "error");
    } finally {
      setArchivingId(null);
    }
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="loading-state">
          <div className="loading-spinner w-10 h-10"></div>
          <p className="loading-state-text text-slate-300">Loading platform console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
      <header className="border-b border-white/10 bg-black/20 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Platform administration</h1>
          <p className="text-sm text-slate-400 mt-1">
            Societies and admins · passwords appear only for admins created in this browser session
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-brand-primary hover:text-white underline">
            Open society admin app
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All societies</h2>
            <button
              type="button"
              onClick={() => void loadSocieties()}
              disabled={loadingList}
              className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50"
            >
              {loadingList ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/30 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Id</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium min-w-[220px]">Society admin login</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {societies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No societies yet. Create one below.
                    </td>
                  </tr>
                ) : (
                  societies.map((s) => (
                    <tr key={`${s.id}-${credentialRenderTick}`} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{s.name}</div>
                        {s.address ? (
                          <div className="text-slate-400 text-xs mt-0.5">{s.address}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={
                              s.status === "ACTIVE"
                                ? "text-emerald-400 text-xs font-semibold"
                                : "text-amber-400 text-xs font-semibold"
                            }
                          >
                            {s.status}
                          </span>
                          {s.archivedAt ? (
                            <span
                              className="text-rose-300 text-[10px] uppercase tracking-wider font-semibold"
                              title={`Archived ${new Date(s.archivedAt).toLocaleString()}`}
                            >
                              Archived
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 break-all max-w-[200px]">
                        {s.id}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-300 max-w-[min(100vw,280px)]">
                        {!s.admins?.length ? (
                          <span className="text-slate-500 italic">No society admin</span>
                        ) : (
                          <ul className="space-y-2">
                            {s.admins.map((a) => {
                              const storedPw = getStoredPasswordForAdmin(s.id, a.username);
                              return (
                                <li
                                  key={a.id}
                                  className="border-l-2 border-brand-primary/50 pl-2 space-y-0.5"
                                >
                                  <div>
                                    <span className="text-slate-500">Username</span>{" "}
                                    <span className="font-mono text-white">{a.username}</span>
                                  </div>
                                  <div className="break-all">
                                    <span className="text-slate-500">Email</span>{" "}
                                    <span>{a.email}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Password</span>{" "}
                                    {storedPw ? (
                                      <span className="font-mono text-amber-200">{storedPw}</span>
                                    ) : (
                                      <span className="text-slate-500 italic">
                                        Not available (server stores hash only)
                                      </span>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
                          onClick={() => void openViewDetail(s)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded-md bg-brand-primary/30 hover:bg-brand-primary/50"
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </button>
                        {s.archivedAt ? (
                          <button
                            type="button"
                            disabled={archivingId === s.id}
                            className="text-xs px-2 py-1 rounded-md bg-approved-solid/20 hover:bg-approved-solid/40 text-emerald-200 disabled:opacity-50"
                            onClick={() => void onRestore(s)}
                          >
                            {archivingId === s.id ? "Restoring…" : "Restore"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={archivingId === s.id}
                            className="text-xs px-2 py-1 rounded-md bg-pending-solid/20 hover:bg-pending-solid/40 text-amber-200 disabled:opacity-50"
                            onClick={() => void onArchive(s)}
                          >
                            {archivingId === s.id ? "Archiving…" : "Archive"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded-md bg-brand-danger/20 hover:bg-brand-danger/40 text-red-200"
                          onClick={() => {
                            setDeleteRow(s);
                            setDeleteConfirmText("");
                          }}
                          title="Permanently delete (requires typed name)"
                        >
                          Delete…
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Create society</h2>
            <form onSubmit={onCreateSociety} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
                <input
                  className="input w-full bg-surface text-fg-primary"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  minLength={2}
                  placeholder="Sunrise Villas"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Address (optional)
                </label>
                <input
                  className="input w-full bg-surface text-fg-primary"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="City, region"
                />
              </div>
              <button
                type="submit"
                disabled={creatingSoc}
                className="btn btn-primary w-full py-2.5"
              >
                {creatingSoc ? "Creating…" : "Create society"}
              </button>
            </form>
          </section>

          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Create society admin</h2>
            <p className="text-xs text-slate-400 mb-4">
              Creates an ADMIN user for the selected society. They sign in at the regular Society Admin login
              with that society chosen in the dropdown.
            </p>
            <form onSubmit={onCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Society</label>
                <select
                  className="input w-full bg-surface text-fg-primary"
                  value={adminSocietyId}
                  onChange={(e) => setAdminSocietyId(e.target.value)}
                  required
                >
                  {societies.length === 0 ? (
                    <option value="">No societies — create one first</option>
                  ) : (
                    societies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
                <input
                  className="input w-full bg-surface text-fg-primary"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full name</label>
                <input
                  className="input w-full bg-surface text-fg-primary"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  className="input w-full bg-surface text-fg-primary"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Temporary password
                </label>
                <input
                  type="password"
                  className="input w-full bg-surface text-fg-primary"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Phone (optional)
                </label>
                <input
                  className="input w-full bg-surface text-fg-primary"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={creatingAdmin || societies.length === 0}
                className="btn btn-primary w-full py-2.5 mt-2"
              >
                {creatingAdmin ? "Creating…" : "Create admin user"}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* View society */}
      {(detailSociety || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full shadow-xl">
            <div className="card-header flex justify-between items-start gap-4 border-b border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white">Society details</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-white text-sm"
                onClick={() => {
                  setDetailSociety(null);
                  setDetailLoading(false);
                }}
              >
                Close
              </button>
            </div>
            <div className="card-body p-6">
            {detailLoading ? (
              <div className="loading-state">
                <div className="loading-spinner w-8 h-8"></div>
                <p className="loading-state-text text-slate-400">Loading…</p>
              </div>
            ) : detailSociety ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Name</span>
                  <p className="text-white font-medium">{detailSociety.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status</span>
                  <p className="text-white">{detailSociety.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Address</span>
                  <p className="text-white">{detailSociety.address ?? "—"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Id</span>
                  <p className="font-mono text-xs text-slate-300 break-all">{detailSociety.id}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                  <div>
                    <span className="text-slate-500 text-xs">Users</span>
                    <p className="text-white font-semibold">{detailSociety.counts.users}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Villas</span>
                    <p className="text-white font-semibold">{detailSociety.counts.villas}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Gates</span>
                    <p className="text-white font-semibold">{detailSociety.counts.gates}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Created {new Date(detailSociety.createdAt).toLocaleString()} · Updated{" "}
                  {new Date(detailSociety.updatedAt).toLocaleString()}
                </p>
                <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={openingTenantSession}
                    className="btn btn-primary text-sm font-medium disabled:opacity-50"
                    onClick={() => void openSocietyAdminDashboard(detailSociety)}
                  >
                    {openingTenantSession ? "Opening…" : "Open society admin dashboard"}
                  </button>
                  <p className="text-xs text-slate-500 w-full">
                    Uses the first active society admin account for API access. Create an admin user
                    below if none exists.
                  </p>
                </div>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Edit society */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form
            onSubmit={onSaveEdit}
            className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full shadow-xl"
          >
            <div className="card-header flex justify-between items-start gap-4 border-b border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white">Edit society</h3>
              <button type="button" className="text-slate-400 hover:text-white text-sm" onClick={() => setEditRow(null)}>
                Cancel
              </button>
            </div>
            <div className="card-body p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
              <input
                className="input w-full bg-surface text-fg-primary"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Address</label>
              <textarea
                className="input w-full bg-surface text-fg-primary min-h-[80px]"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
              <select
                className="input w-full bg-surface text-fg-primary"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <button type="submit" disabled={savingEdit} className="btn btn-primary w-full py-2.5">
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete society — typed-name confirmation. The "safe" action is
          Archive (per-row button, reversible). This modal is only the
          permanent-delete path. */}
      {deleteRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-brand-danger/30 rounded-2xl max-w-md w-full shadow-xl">
            <div className="card-header border-b border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white">Delete permanently?</h3>
            </div>
            <div className="card-body p-6">
            <p className="text-sm text-slate-300 mb-3">
              This drops <strong className="text-white">{deleteRow.name}</strong> and{" "}
              <strong className="text-amber-200">cascades</strong> across users, villas, billing, visitors,
              parcels, and every other tenant-scoped table. This is irreversible — there is no undo, no
              backup restore from this UI.
            </p>
            <p className="text-sm text-slate-300 mb-2">
              {deleteRow.archivedAt
                ? "The society is currently archived. If this is the wrong row, click Cancel and Restore from the list."
                : "If you only need to take this society offline, Cancel and click Archive instead — that's reversible."}
            </p>
            <label className="block text-xs text-slate-400 mt-4 mb-1">
              Type <span className="font-mono text-white">{deleteRow.name}</span> to confirm:
            </label>
            <input
              type="text"
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm font-mono"
              placeholder={deleteRow.name}
            />
            <div className="flex gap-3 justify-end mt-5">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => {
                  setDeleteRow(null);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleting ||
                  deleteConfirmText.trim().toLowerCase() !== deleteRow.name.toLowerCase()
                }
                className="btn btn-danger text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => void onConfirmDelete()}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
