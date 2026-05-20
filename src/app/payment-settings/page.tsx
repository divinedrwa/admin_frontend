"use client";

import { Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

type SocietySettings = {
  upiVpa: string | null;
  upiQrCodeUrl: string | null;
};

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<SocietySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // VPA
  const [vpa, setVpa] = useState("");
  const [savingVpa, setSavingVpa] = useState(false);

  // QR
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api
      .get("/society-settings")
      .then((res) => {
        const s = res.data?.society;
        if (s) {
          setSettings({ upiVpa: s.upiVpa ?? null, upiQrCodeUrl: s.upiQrCodeUrl ?? null });
          setVpa(s.upiVpa ?? "");
        }
      })
      .catch(() => showToast("Failed to load payment settings", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // --- VPA ---
  const handleSaveVpa = async () => {
    const trimmed = vpa.trim();
    if (trimmed && !trimmed.includes("@")) {
      showToast("VPA must contain @", "error");
      return;
    }
    setSavingVpa(true);
    try {
      await api.patch("/society-settings", { upiVpa: trimmed || null });
      showToast("UPI VPA saved", "success");
      load();
    } catch {
      showToast("Failed to save VPA", "error");
    } finally {
      setSavingVpa(false);
    }
  };

  const handleClearVpa = async () => {
    setSavingVpa(true);
    try {
      await api.patch("/society-settings", { upiVpa: null });
      setVpa("");
      showToast("UPI VPA cleared", "success");
      load();
    } catch {
      showToast("Failed to clear VPA", "error");
    } finally {
      setSavingVpa(false);
    }
  };

  // --- QR ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadQr = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      showToast("Select an image first", "error");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("qrImage", file);
      await api.post("/society-settings/upload-qr", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("QR code uploaded", "success");
      setPreviewUrl(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch {
      showToast("Failed to upload QR code", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveQr = async () => {
    setRemoving(true);
    try {
      await api.delete("/society-settings/qr-code");
      showToast("QR code removed", "success");
      load();
    } catch {
      showToast("Failed to remove QR code", "error");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AppShell title="Payment settings">
      <div className="max-w-3xl space-y-6">
        <AdminPageHeader
          eyebrow="Configuration"
          title="Payment settings"
          description="Configure the UPI Virtual Payment Address (VPA) and an optional QR code image that residents see when paying maintenance."
          icon={<Wallet className="h-6 w-6" />}
        />

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading settings...</p>
          </div>
        ) : !settings ? (
          <p className="text-brand-danger">Could not load payment settings.</p>
        ) : (
          <>
            {/* Card 1: UPI VPA */}
            <div className="card card-body space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg-primary">UPI VPA</h2>
                <p className="text-sm text-fg-secondary mt-1">
                  The virtual payment address residents will pay to (e.g. society@ybl).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="e.g. society@ybl"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingVpa}
                    onClick={handleSaveVpa}
                  >
                    {savingVpa ? "Saving..." : "Save"}
                  </button>
                  {settings.upiVpa && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={savingVpa}
                      onClick={handleClearVpa}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: QR Code Image */}
            <div className="card card-body space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-fg-primary">QR code image</h2>
                <p className="text-sm text-fg-secondary mt-1">
                  Upload a custom QR code image (e.g. from your bank app). Residents will see this
                  instead of the auto-generated QR.
                </p>
              </div>

              {/* Current image */}
              {settings.upiQrCodeUrl && (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-surface-border p-4">
                  <p className="text-sm font-medium text-fg-secondary">Current QR code</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.upiQrCodeUrl}
                    alt="UPI QR Code"
                    className="max-h-56 rounded-lg"
                  />
                  <button
                    type="button"
                    className="btn btn-danger text-sm"
                    disabled={removing}
                    onClick={handleRemoveQr}
                  >
                    {removing ? "Removing..." : "Remove QR code"}
                  </button>
                </div>
              )}

              {/* Upload new */}
              <div className="space-y-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="input"
                  onChange={handleFileChange}
                />

                {previewUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-fg-secondary">Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg" />
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={uploading || !previewUrl}
                  onClick={handleUploadQr}
                >
                  {uploading ? "Uploading..." : "Upload QR code"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
