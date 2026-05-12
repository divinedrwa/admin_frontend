"use client";

import { Link2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type InvitationRow = {
  id: string;
  role: string;
  phone: string | null;
  email: string | null;
  villaId: string | null;
  villa: { villaNumber: string; block: string | null } | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
};

type Villa = {
  id: string;
  villaNumber: string;
  block: string | null;
};

export default function InvitationsAdminPage() {
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"ADMIN" | "RESIDENT" | "GUARD">("RESIDENT");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastCreatedLink, setLastCreatedLink] = useState("");
  const [copyToken, setCopyToken] = useState("");
  const [selectedVillaId, setSelectedVillaId] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/invitations")
      .then((res) => setRows(res.data.invitations ?? []))
      .catch((e: unknown) => {
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to load invitations";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api
      .get("/villas")
      .then((res) => setVillas(res.data.villas ?? []))
      .catch(() => {
        /* optional */
      });
  }, []);

  const acceptBase =
    typeof window !== "undefined" ? `${window.location.origin}/invite/accept` : "";

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const p = phone.trim() || undefined;
    const em = email.trim() || undefined;
    if (!p && !em) {
      showToast("Provide at least phone or email", "error");
      return;
    }
    setCreating(true);
    setLastCreatedLink("");
    setCopyToken("");
    try {
      const body: Record<string, unknown> = {
        role,
        phone: p ?? null,
        email: em ?? null,
      };
      if (role === "RESIDENT" && selectedVillaId) {
        body.villaId = selectedVillaId;
      }
      const { data } = await api.post("/invitations", body);
      const token = data?.invitation?.token as string | undefined;
      if (token) {
        setCopyToken(token);
        setLastCreatedLink(`${acceptBase}?token=${encodeURIComponent(token)}`);
        showToast("Invitation created — copy the link or token", "success");
      }
      load();
      setPhone("");
      setEmail("");
      setSelectedVillaId("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not create invite";
      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await api.patch(`/invitations/${id}/revoke`);
      showToast("Invitation revoked", "success");
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not revoke";
      showToast(message, "error");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied", "success");
    } catch {
      showToast("Copy failed", "error");
    }
  };

  return (
    <AppShell title="Invitations">
      <div className="max-w-4xl space-y-8">
        <AdminPageHeader
          eyebrow="Onboarding"
          title="Invitations"
          description="Create secure invite links for admins, residents, and guards so they can finish signup through the invite acceptance flow on web or mobile."
          icon={<Link2 className="h-6 w-6" />}
        />

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-fg-primary">New invitation</h2>
          </div>
          <div className="card-body space-y-4">
          <form onSubmit={(e) => void onCreate(e)} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Role</label>
              <select
                className="input w-full"
                value={role}
                onChange={(e) => {
                  const r = e.target.value as typeof role;
                  setRole(r);
                  if (r !== "RESIDENT") setSelectedVillaId("");
                }}
              >
                <option value="RESIDENT">Resident</option>
                <option value="GUARD">Guard</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 text-sm text-fg-secondary">
              {role === "RESIDENT" ? (
                <div className="space-y-2">
                  <p>Optional: attach a villa so the resident does not need to enter an id at signup.</p>
                  {villas.length > 0 ? (
                    <select
                      className="input max-w-md"
                      value={selectedVillaId}
                      onChange={(e) => setSelectedVillaId(e.target.value)}
                    >
                      <option value="">No villa (they can pick at signup if allowed)</option>
                      {villas.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.villaNumber}
                          {v.block ? ` (${v.block})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-pending-fg">No villas loaded — add villas first.</p>
                  )}
                </div>
              ) : (
                <p>Villa attachment applies only to resident invitations.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Phone (optional)</label>
              <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Email (optional)</label>
              <input type="email" className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="btn btn-primary"
              >
                {creating ? "Creating…" : "Create invitation"}
              </button>
            </div>
          </form>

          {(lastCreatedLink || copyToken) && (
            <div className="rounded-lg bg-brand-primary-light border border-surface-border p-4 space-y-2 text-sm">
              <p className="font-medium text-fg-primary">Share this once (token is not shown again in the list).</p>
              {lastCreatedLink && (
                <div className="flex gap-2 items-center flex-wrap">
                  <code className="text-xs break-all flex-1 min-w-[200px]">{lastCreatedLink}</code>
                  <button type="button" className="text-brand-primary underline" onClick={() => void copy(lastCreatedLink)}>
                    Copy link
                  </button>
                </div>
              )}
              {copyToken && (
                <div className="flex gap-2 items-center flex-wrap">
                  <code className="text-xs break-all flex-1 font-mono">{copyToken}</code>
                  <button type="button" className="text-brand-primary underline" onClick={() => void copy(copyToken)}>
                    Copy token
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="table-wrapper overflow-x-auto">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-fg-primary">Recent invitations</h2>
          </div>
          {loading ? (
            <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading invitations...</p></div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">✉️</span>
              <p className="empty-state-title">No invitations yet</p>
              <p className="empty-state-text">Create an invitation above to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Villa</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Contact</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Expires</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="table-td">
                        {r.villa
                          ? `${r.villa.villaNumber}${r.villa.block ? ` (${r.villa.block})` : ""}`
                          : "—"}
                      </td>
                      <td className="table-td">
                        <span className={`badge ${r.role === "ADMIN" ? "badge-primary" : r.role === "GUARD" ? "badge-success" : "badge-info"}`}>
                          {r.role}
                        </span>
                      </td>
                      <td className="table-td">
                        {[r.phone, r.email].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="table-td">
                        <span className={`badge ${r.status === "PENDING" ? "badge-warning" : r.status === "ACCEPTED" ? "badge-success" : "badge-danger"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="table-td">{new Date(r.expiresAt).toLocaleDateString()}</td>
                      <td className="table-td text-right">
                        {r.status === "PENDING" && (
                          <button
                            type="button"
                            className="text-brand-danger hover:underline"
                            onClick={() => void revoke(r.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
