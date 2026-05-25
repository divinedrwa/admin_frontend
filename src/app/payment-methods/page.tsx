"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CreditCard,
  Plug,
  Plus,
  QrCode,
  Smartphone,
  Trash2,
  Pencil,
  GripVertical,
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type PaymentMethod = {
  id: string;
  type: string;
  displayName: string;
  isEnabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
  createdAt: string;
};

type ApiError = {
  response?: { data?: { message?: string } };
};

const TYPE_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
  { value: "UPI_VPA", label: "UPI VPA", icon: Smartphone },
  { value: "UPI_QR", label: "UPI QR Code", icon: QrCode },
  { value: "RAZORPAY", label: "Razorpay", icon: CreditCard },
  { value: "PHONEPE", label: "PhonePe", icon: Smartphone },
] as const;

function typeIcon(type: string) {
  const opt = TYPE_OPTIONS.find((o) => o.value === type);
  if (!opt) return CreditCard;
  return opt.icon;
}

function typeLabel(type: string) {
  return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

const EMPTY_FORMS: Record<string, Record<string, string>> = {
  BANK_TRANSFER: {
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    accountType: "SAVINGS",
  },
  UPI_VPA: { vpa: "" },
  UPI_QR: { qrCodeUrl: "" },
  RAZORPAY: { keyId: "", keySecret: "", webhookSecret: "", currency: "INR" },
  PHONEPE: { merchantId: "", saltKey: "", saltIndex: "1", environment: "SANDBOX" },
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Create form state
  const [createType, setCreateType] = useState("BANK_TRANSFER");
  const [createName, setCreateName] = useState("");
  const [createConfig, setCreateConfig] = useState<Record<string, string>>(
    EMPTY_FORMS["BANK_TRANSFER"],
  );

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});

  // QR upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payment-methods");
      setMethods(res.data.methods ?? []);
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Failed to load payment methods", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  // ── Create ──────────────────────────────────────────────────────

  const handleTypeChange = (type: string) => {
    setCreateType(type);
    setCreateConfig({ ...EMPTY_FORMS[type] });
    setCreateName(typeLabel(type));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const config: Record<string, unknown> = { ...createConfig };
      // Convert saltIndex to number for PHONEPE
      if (createType === "PHONEPE" && config.saltIndex) {
        config.saltIndex = Number(config.saltIndex);
      }
      await api.post("/payment-methods", {
        type: createType,
        displayName: createName,
        config,
      });
      showToast("Payment method created", "success");
      setShowCreate(false);
      resetCreateForm();
      fetchMethods();
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Failed to create", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateType("BANK_TRANSFER");
    setCreateName("");
    setCreateConfig({ ...EMPTY_FORMS["BANK_TRANSFER"] });
  };

  // ── Edit ────────────────────────────────────────────────────────

  const openEdit = (m: PaymentMethod) => {
    setEditingMethod(m);
    setEditName(m.displayName);
    const cfg: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.config)) {
      cfg[k] = v != null ? String(v) : "";
    }
    setEditConfig(cfg);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    setSaving(true);
    try {
      const config: Record<string, unknown> = { ...editConfig };
      if (editingMethod.type === "PHONEPE" && config.saltIndex) {
        config.saltIndex = Number(config.saltIndex);
      }
      await api.patch(`/payment-methods/${editingMethod.id}`, {
        displayName: editName,
        config,
      });
      showToast("Payment method updated", "success");
      setEditingMethod(null);
      fetchMethods();
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle ──────────────────────────────────────────────────────

  const handleToggle = async (m: PaymentMethod) => {
    try {
      await api.patch(`/payment-methods/${m.id}`, { isEnabled: !m.isEnabled });
      setMethods((prev) =>
        prev.map((p) => (p.id === m.id ? { ...p, isEnabled: !p.isEnabled } : p)),
      );
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Failed to toggle", "error");
    }
  };

  // ── Delete ──────────────────────────────────────────────────────

  const handleDelete = async (m: PaymentMethod) => {
    if (!confirm(`Delete "${m.displayName}"?`)) return;
    try {
      await api.delete(`/payment-methods/${m.id}`);
      showToast("Payment method deleted", "success");
      fetchMethods();
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Failed to delete", "error");
    }
  };

  // ── Test Connection ─────────────────────────────────────────────

  const handleTestConnection = async (m: PaymentMethod) => {
    setTesting(m.id);
    try {
      const res = await api.post(`/payment-methods/${m.id}/test-connection`);
      const { success, message } = res.data;
      showToast(message, success ? "success" : "error");
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Test failed", "error");
    } finally {
      setTesting(null);
    }
  };

  // ── QR Upload ───────────────────────────────────────────────────

  const handleQrUpload = async (m: PaymentMethod) => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      showToast("Select an image first", "error");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("qrImage", file);
      await api.post(`/payment-methods/${m.id}/upload-qr`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("QR code uploaded", "success");
      if (fileRef.current) fileRef.current.value = "";
      fetchMethods();
    } catch (err) {
      const e = err as ApiError;
      showToast(e.response?.data?.message ?? "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  // ── Config summary ──────────────────────────────────────────────

  const configSummary = (m: PaymentMethod) => {
    const c = m.config;
    switch (m.type) {
      case "BANK_TRANSFER":
        return `${c.bankName} — ****${String(c.accountNumber ?? "").slice(-4)} (${c.accountType})`;
      case "UPI_VPA":
        return String(c.vpa ?? "—");
      case "UPI_QR":
        return c.qrCodeUrl ? "QR image uploaded" : "No QR image";
      case "RAZORPAY":
        return c.keyId ? `Key: ${String(c.keyId).slice(0, 12)}...` : "Not configured";
      case "PHONEPE":
        return c.merchantId ? `Merchant: ${c.merchantId} (${c.environment})` : "Not configured";
      default:
        return "";
    }
  };

  // ── Config form fields ──────────────────────────────────────────

  const renderConfigFields = (
    type: string,
    config: Record<string, string>,
    setConfig: (c: Record<string, string>) => void,
    isEdit: boolean,
  ) => {
    const field = (label: string, key: string, opts?: { type?: string; placeholder?: string }) => (
      <div key={key}>
        <label className="block text-sm font-medium text-fg-primary mb-1">{label}</label>
        <input
          type={opts?.type ?? "text"}
          value={config[key] ?? ""}
          onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          placeholder={opts?.placeholder}
          className="input"
          required={!isEdit}
        />
      </div>
    );

    switch (type) {
      case "BANK_TRANSFER":
        return (
          <>
            {field("Bank Name", "bankName", { placeholder: "State Bank of India" })}
            {field("Account Holder", "accountHolderName")}
            {field("Account Number", "accountNumber")}
            {field("IFSC Code", "ifscCode", { placeholder: "SBIN0001234" })}
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Account Type</label>
              <select
                value={config.accountType ?? "SAVINGS"}
                onChange={(e) => setConfig({ ...config, accountType: e.target.value })}
                className="input"
              >
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            </div>
          </>
        );
      case "UPI_VPA":
        return field("UPI VPA", "vpa", { placeholder: "society@ybl" });
      case "UPI_QR":
        return (
          <p className="text-sm text-fg-secondary">
            QR code image can be uploaded after creating this method.
          </p>
        );
      case "RAZORPAY":
        return (
          <>
            {field("Key ID", "keyId", { placeholder: "rzp_live_..." })}
            {field("Key Secret", "keySecret", { type: "password" })}
            {field("Webhook Secret (optional)", "webhookSecret", { type: "password" })}
            {field("Currency", "currency", { placeholder: "INR" })}
          </>
        );
      case "PHONEPE":
        return (
          <>
            {field("Merchant ID", "merchantId")}
            {field("Salt Key", "saltKey", { type: "password" })}
            {field("Salt Index", "saltIndex", { placeholder: "1" })}
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Environment</label>
              <select
                value={config.environment ?? "SANDBOX"}
                onChange={(e) => setConfig({ ...config, environment: e.target.value })}
                className="input"
              >
                <option value="SANDBOX">Sandbox</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell title="Payment methods">
      <div className="max-w-5xl space-y-6">
        <AdminPageHeader
          eyebrow="Configuration"
          title="Payment methods"
          description="Manage all payment methods residents can use to pay maintenance dues. Enable or disable individual methods, configure credentials, and set display order."
          icon={<CreditCard className="h-6 w-6" />}
          actions={
            <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add method
            </button>
          }
        />

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading payment methods...</p>
          </div>
        ) : methods.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon"><CreditCard className="h-12 w-12 text-fg-tertiary" /></span>
            <p className="empty-state-title">No payment methods configured</p>
            <p className="empty-state-text">Add your first payment method to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map((m) => {
              const Icon = typeIcon(m.type);
              return (
                <div
                  key={m.id}
                  className={`card card-body flex flex-col sm:flex-row sm:items-center gap-4 ${
                    !m.isEnabled ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 text-fg-tertiary">
                    <GripVertical className="h-4 w-4 cursor-grab" />
                    <div className="rounded-xl bg-brand-primary-light p-2.5 text-brand-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-fg-primary truncate">{m.displayName}</h3>
                      <span className="badge badge-primary text-xs">{typeLabel(m.type)}</span>
                    </div>
                    <p className="text-sm text-fg-secondary mt-0.5 truncate">{configSummary(m)}</p>
                    {m.type === "UPI_QR" && typeof m.config.qrCodeUrl === "string" && m.config.qrCodeUrl ? (
                      <div className="mt-2">
                        <Image
                          src={m.config.qrCodeUrl}
                          alt="QR"
                          width={80}
                          height={80}
                          className="rounded-lg"
                          unoptimized
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Enable/Disable toggle */}
                    <button
                      onClick={() => handleToggle(m)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        m.isEnabled ? "bg-brand-primary" : "bg-surface-border"
                      }`}
                      title={m.isEnabled ? "Disable" : "Enable"}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          m.isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    {/* Test Connection (Razorpay/PhonePe) */}
                    {(m.type === "RAZORPAY" || m.type === "PHONEPE") && (
                      <button
                        onClick={() => handleTestConnection(m)}
                        disabled={testing === m.id}
                        className="btn btn-ghost text-xs flex items-center gap-1"
                        title="Test connection"
                      >
                        <Plug className="h-3.5 w-3.5" />
                        {testing === m.id ? "Testing..." : "Test"}
                      </button>
                    )}

                    {/* QR Upload (UPI_QR) */}
                    {m.type === "UPI_QR" && (
                      <div className="flex items-center gap-1">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={() => handleQrUpload(m)}
                        />
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="btn btn-ghost text-xs"
                        >
                          {uploading ? "Uploading..." : "Upload QR"}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => openEdit(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium text-fg-secondary hover:bg-brand-primary-light hover:text-brand-primary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-danger/20 bg-surface px-3 py-1.5 text-sm font-medium text-brand-danger hover:bg-brand-danger/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} maxWidth="max-w-lg">
          <div className="bg-surface rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Add Payment Method</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Type</label>
                <select
                  value={createType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="input"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="input"
                  placeholder={typeLabel(createType)}
                />
              </div>

              {renderConfigFields(createType, createConfig, setCreateConfig, false)}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          open={editingMethod !== null}
          onClose={() => setEditingMethod(null)}
          maxWidth="max-w-lg"
        >
          {editingMethod && (
            <div className="bg-surface rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">
                Edit {typeLabel(editingMethod.type)}
              </h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input"
                  />
                </div>

                {renderConfigFields(editingMethod.type, editConfig, setEditConfig, true)}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMethod(null)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
