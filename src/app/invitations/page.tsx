"use client";

import { FormEvent, useEffect, useState } from "react";
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
        <p className="text-gray-600">
          Create invite links for new admins, residents, or guards. They complete signup on{" "}
          <span className="font-mono text-sm bg-gray-100 px-1 rounded">/invite/accept</span> or in the mobile app
          (Join with invite).
        </p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">New invitation</h2>
          <form onSubmit={(e) => void onCreate(e)} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
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
            <div className="sm:col-span-2 text-sm text-gray-500">
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
                    <p className="text-amber-700">No villas loaded — add villas first.</p>
                  )}
                </div>
              ) : (
                <p>Villa attachment applies only to resident invitations.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input className="input w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input type="email" className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create invitation"}
              </button>
            </div>
          </form>

          {(lastCreatedLink || copyToken) && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2 text-sm">
              <p className="font-medium text-blue-900">Share this once (token is not shown again in the list).</p>
              {lastCreatedLink && (
                <div className="flex gap-2 items-center flex-wrap">
                  <code className="text-xs break-all flex-1 min-w-[200px]">{lastCreatedLink}</code>
                  <button type="button" className="text-blue-700 underline" onClick={() => void copy(lastCreatedLink)}>
                    Copy link
                  </button>
                </div>
              )}
              {copyToken && (
                <div className="flex gap-2 items-center flex-wrap">
                  <code className="text-xs break-all flex-1 font-mono">{copyToken}</code>
                  <button type="button" className="text-blue-700 underline" onClick={() => void copy(copyToken)}>
                    Copy token
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent invitations</h2>
          </div>
          {loading ? (
            <p className="p-6 text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-gray-500">No invitations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Villa</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        {r.villa
                          ? `${r.villa.villaNumber}${r.villa.block ? ` (${r.villa.block})` : ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{r.role}</td>
                      <td className="px-4 py-3">
                        {[r.phone, r.email].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3">{r.status}</td>
                      <td className="px-4 py-3">{new Date(r.expiresAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "PENDING" && (
                          <button
                            type="button"
                            className="text-red-600 hover:underline"
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
