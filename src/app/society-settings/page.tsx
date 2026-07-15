"use client";

import { useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from "react";
import { api } from "@/lib/api";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { Save, Upload, Trash2, Smartphone, Monitor, Eye, RotateCcw, Settings } from "lucide-react";
import { applyThemeColors, mergeThemeColors } from "@/theme/ThemeProvider";
import {
  DEFAULT_THEME_COLORS,
  THEME_COLOR_USAGE,
  resolveSidebarVia,
  type ThemeColors,
} from "@/theme/defaultThemeColors";
import { THEME_TEMPLATES } from "@/theme/themeTemplates";

type SocietySettings = {
  id: string;
  name: string;
  status: string;
  visitorMultiVillaApprovalMode: string;
  visitorApprovalRequired: boolean;
  guardCanApproveVisitors: boolean;
  upiVpa: string | null;
  upiQrCodeUrl: string | null;
  letterheadUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  splashUrl: string | null;
  lateFeePercentage: number;
  lateFeeFixedAmount: number;
  maintenanceGracePeriodDays: number;
  maintenanceBillingMode?: "FIXED" | "SQFT";
  maintenanceFixedAmount?: number | null;
  maintenanceSqftRate?: number | null;
  themeColors: Record<string, string> | null;
};

const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "visitors", label: "Visitors & Gate" },
  { id: "billing", label: "Billing & UPI" },
  { id: "branding", label: "Branding & Theme" },
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const RGB_COLOR = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+)?\s*\)$/i;

// Mirror the backend zod schema (society-settings/routes.ts): every theme color
// must be a 6-digit hex; only `fieldBg` may additionally be rgb()/rgba().
function isValidThemeColor(value: string, key?: keyof ThemeColors): boolean {
  if (key === "fieldBg") return HEX_COLOR.test(value) || RGB_COLOR.test(value);
  return HEX_COLOR.test(value);
}

/** Native color inputs only accept #rrggbb — map rgba/rgb to a close hex when needed. */
function colorPickerValue(value: string): string {
  if (HEX_COLOR.test(value)) return value;
  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return "#0A74F5";
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
}

function themeColorsEqual(a: ThemeColors, b: ThemeColors): boolean {
  return (Object.keys(DEFAULT_THEME_COLORS) as (keyof ThemeColors)[]).every(
    (key) => a[key] === b[key],
  );
}

function savedThemeFromSettings(settings: SocietySettings | null): ThemeColors {
  return mergeThemeColors(settings?.themeColors ?? null);
}

type ThemeColorFieldProps = {
  label: string;
  hint?: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
};

function ThemeColorField({
  label,
  hint,
  value,
  defaultValue,
  onChange,
  usageKey,
}: ThemeColorFieldProps & { usageKey?: keyof ThemeColors }) {
  const invalid = value.length > 0 && !isValidThemeColor(value, usageKey);
  const swatch = isValidThemeColor(value, usageKey) ? value : defaultValue;
  const usage = usageKey ? THEME_COLOR_USAGE[usageKey] : undefined;

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md">
      <label className="mb-2 block text-sm font-medium text-fg-primary">{label}</label>
      {hint ? <p className="mb-2 text-[11px] leading-snug text-fg-tertiary">{hint}</p> : null}
      {usage ? (
        <p className="mb-2 text-[10px] leading-snug text-fg-tertiary/90">
          Used for: {usage}
        </p>
      ) : null}
      <div
        className={`flex items-center gap-2 rounded-lg border bg-surface-elevated px-2.5 py-2 ${
          invalid ? "border-brand-danger" : "border-surface-border"
        }`}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultValue}
          className="min-w-0 flex-1 border-0 bg-transparent font-mono text-xs text-fg-primary outline-none"
          maxLength={32}
          spellCheck={false}
          aria-invalid={invalid}
        />
        <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-surface-border shadow-inner">
          <span
            className="absolute inset-0"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <input
            type="color"
            value={colorPickerValue(value)}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            title={`Pick ${label}`}
          />
        </label>
      </div>
      {invalid ? (
        <p className="mt-1.5 text-[11px] text-brand-danger">Use #RRGGBB or rgb()/rgba()</p>
      ) : null}
    </div>
  );
}

type ThemeColorGroupProps = {
  title: string;
  children: ReactNode;
};

function ThemeColorGroup({ title, children }: ThemeColorGroupProps) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-tertiary">{title}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

type ThemePreviewProps = {
  theme: ThemeColors;
};

function MobileAppThemePreview({ theme }: ThemePreviewProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-surface-border shadow-sm"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <div className="border-b border-surface-border px-4 py-3" style={{ backgroundColor: theme.cardColor }}>
        <p className="text-sm font-semibold" style={{ color: theme.headingColor }}>
          Society Home
        </p>
        <p className="text-xs" style={{ color: theme.bodyTextColor }}>
          Content text preview
        </p>
      </div>
      <div className="space-y-3 p-4">
        <div
          className="rounded-xl border px-3 py-2 text-xs"
          style={{
            backgroundColor: theme.fieldBg,
            borderColor: theme.borderColor,
            color: theme.fieldText,
          }}
        >
          Input field preview
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-xs font-semibold shadow-sm"
            style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
          >
            Primary button
          </button>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-xs font-semibold"
            style={{ backgroundColor: theme.secondaryButtonBg, color: theme.secondaryButtonText }}
          >
            Secondary
          </button>
        </div>
        <div
          className="h-8 rounded-xl"
          style={{
            background: `linear-gradient(90deg, ${theme.gradientStart}, ${theme.gradientMiddle}, ${theme.gradientEnd})`,
          }}
          title="Brand gradient preview"
        />
        <div className="flex items-center gap-2 text-xs" style={{ color: theme.mutedTextColor }}>
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
          >
            ◆
          </span>
          Icon preview
        </div>
      </div>
    </div>
  );
}

function AdminDashboardThemePreview({ theme }: ThemePreviewProps) {
  const sidebarVia = resolveSidebarVia(theme.sidebarBg);

  return (
    <div className="flex overflow-hidden rounded-2xl border border-surface-border shadow-sm">
      <div
        className="w-28 shrink-0 space-y-2 p-3"
        style={{
          background: `linear-gradient(to bottom, ${theme.sidebarBg}, ${sidebarVia}, ${theme.sidebarBg})`,
        }}
      >
        <div className="h-2 w-12 rounded bg-white/20" />
        <div
          className="rounded-lg px-2 py-1.5 text-[10px] font-semibold"
          style={{
            backgroundColor: theme.sidebarActiveColor,
            color: "#FFFFFF",
          }}
        >
          Dashboard
        </div>
        <div
          className="rounded-lg px-2 py-1.5 text-[10px]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Residents
        </div>
      </div>
      <div className="flex-1 p-4" style={{ backgroundColor: theme.backgroundColor }}>
        <p className="text-sm font-semibold" style={{ color: theme.headingColor }}>
          Admin panel
        </p>
        <p className="mt-1 text-xs" style={{ color: theme.bodyTextColor }}>
          Sidebar + page background preview
        </p>
        <div
          className="mt-3 rounded-xl border px-3 py-2 text-xs"
          style={{
            backgroundColor: theme.cardColor,
            borderColor: theme.borderColor,
            color: theme.bodyTextColor,
          }}
        >
          Card surface
        </div>
      </div>
    </div>
  );
}

export default function SocietySettingsPage() {
  const [settings, setSettings] = useState<SocietySettings | null>(null);
  const [tab, setTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [savingLateFee, setSavingLateFee] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const letterheadFileRef = useRef<HTMLInputElement>(null);
  const signatureFileRef = useRef<HTMLInputElement>(null);
  const stampFileRef = useRef<HTMLInputElement>(null);
  const splashFileRef = useRef<HTMLInputElement>(null);

  // Visitor settings form
  const [visitorForm, setVisitorForm] = useState({
    visitorApprovalRequired: false,
    guardCanApproveVisitors: false,
    visitorMultiVillaApprovalMode: "ANY_ONE_APPROVAL",
  });

  // Late fee form
  const [lateFeeForm, setLateFeeForm] = useState({
    lateFeePercentage: 0,
    lateFeeFixedAmount: 0,
    maintenanceGracePeriodDays: 15,
  });

  const [maintenanceBillingForm, setMaintenanceBillingForm] = useState({
    maintenanceBillingMode: "FIXED" as "FIXED" | "SQFT",
    maintenanceFixedAmount: 1100,
    maintenanceSqftRate: 1.1,
  });
  const [savingMaintenanceBilling, setSavingMaintenanceBilling] = useState(false);

  // UPI form
  const [upiForm, setUpiForm] = useState({ upiVpa: "" });

  // Theme colors form
  const [themeForm, setThemeForm] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [savingTheme, setSavingTheme] = useState(false);

  const savedTheme = useMemo(
    () => savedThemeFromSettings(settings),
    [settings],
  );

  const themeDirty = useMemo(
    () => !themeColorsEqual(themeForm, savedTheme),
    [themeForm, savedTheme],
  );

  const themeHasInvalidColors = useMemo(
    () =>
      (Object.keys(themeForm) as (keyof ThemeColors)[]).some(
        (key) => !isValidThemeColor(themeForm[key], key),
      ),
    [themeForm],
  );

  const activeTemplateId = useMemo(
    () =>
      THEME_TEMPLATES.find((t) => themeColorsEqual(t.colors, themeForm))?.id ??
      null,
    [themeForm],
  );

  const setThemeColor = (key: keyof ThemeColors, value: string) => {
    setThemeForm((prev) => ({ ...prev, [key]: value }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get("/society-settings");
      const s = data.society as SocietySettings;
      setSettings(s);
      setVisitorForm({
        visitorApprovalRequired: s.visitorApprovalRequired,
        guardCanApproveVisitors: s.guardCanApproveVisitors,
        visitorMultiVillaApprovalMode: s.visitorMultiVillaApprovalMode,
      });
      setLateFeeForm({
        lateFeePercentage: s.lateFeePercentage,
        lateFeeFixedAmount: s.lateFeeFixedAmount,
        maintenanceGracePeriodDays: s.maintenanceGracePeriodDays,
      });
      setMaintenanceBillingForm({
        maintenanceBillingMode: s.maintenanceBillingMode ?? "FIXED",
        maintenanceFixedAmount: Number(s.maintenanceFixedAmount ?? 1100) || 1100,
        maintenanceSqftRate: Number(s.maintenanceSqftRate ?? 1.1) || 1.1,
      });
      setUpiForm({ upiVpa: s.upiVpa || "" });
      if (s.themeColors) {
        setThemeForm(mergeThemeColors(s.themeColors));
      } else {
        setThemeForm(DEFAULT_THEME_COLORS);
      }
    } catch (error) {
      const msg = parseApiError(error, "Failed to load settings").message;
      setLoadError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveVisitor = async () => {
    setSavingVisitor(true);
    try {
      await api.patch("/society-settings", visitorForm);
      showToast("Visitor settings saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save").message, "error");
    } finally {
      setSavingVisitor(false);
    }
  };

  const saveLateFee = async () => {
    setSavingLateFee(true);
    try {
      await api.patch("/society-settings/late-fee", lateFeeForm);
      showToast("Late fee settings saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save").message, "error");
    } finally {
      setSavingLateFee(false);
    }
  };

  const saveMaintenanceBilling = async () => {
    setSavingMaintenanceBilling(true);
    try {
      await api.patch("/society-settings/maintenance-billing", maintenanceBillingForm);
      showToast("Maintenance billing mode saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save billing mode").message, "error");
    } finally {
      setSavingMaintenanceBilling(false);
    }
  };

  const saveUpi = async () => {
    setSavingUpi(true);
    try {
      await api.patch("/society-settings", {
        upiVpa: upiForm.upiVpa || null,
      });
      showToast("UPI settings saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save").message, "error");
    } finally {
      setSavingUpi(false);
    }
  };

  const uploadImage = async (
    file: File,
    field: "qrImage" | "letterhead" | "signature" | "stamp" | "splash",
    endpoint: string,
    setBusy: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
    successMsg: string,
  ) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      showToast("Please choose a PNG, JPG or WEBP image", "error");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append(field, file);
      await api.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(successMsg, "success");
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Upload failed").message, "error");
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async (endpoint: string, successMsg: string) => {
    try {
      await api.delete(endpoint);
      showToast(successMsg, "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to remove").message, "error");
    }
  };

  const previewTheme = () => {
    applyThemeColors(themeForm);
    showToast("Preview applied to this browser session", "success");
  };

  const saveTheme = async () => {
    if (themeHasInvalidColors) {
      showToast("Fix invalid color values before saving", "error");
      return;
    }
    setSavingTheme(true);
    try {
      const payload = themeColorsEqual(themeForm, DEFAULT_THEME_COLORS)
        ? null
        : themeForm;
      await api.patch("/society-settings", { themeColors: payload });
      applyThemeColors(payload);
      showToast("Theme saved", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to save theme").message, "error");
    } finally {
      setSavingTheme(false);
    }
  };

  /** One-tap: apply a ready-made template — sets the form, persists, and re-skins. */
  const applyTemplate = async (colors: ThemeColors) => {
    setThemeForm(colors);
    setSavingTheme(true);
    try {
      const payload = themeColorsEqual(colors, DEFAULT_THEME_COLORS) ? null : colors;
      await api.patch("/society-settings", { themeColors: payload });
      applyThemeColors(payload);
      showToast("Theme applied", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to apply theme").message, "error");
    } finally {
      setSavingTheme(false);
    }
  };

  const resetTheme = async () => {
    setSavingTheme(true);
    try {
      await api.patch("/society-settings", { themeColors: null });
      setThemeForm(DEFAULT_THEME_COLORS);
      applyThemeColors(null);
      showToast("Theme reset to defaults", "success");
      await load();
    } catch (error) {
      showToast(parseApiError(error, "Failed to reset theme").message, "error");
    } finally {
      setSavingTheme(false);
    }
  };

  const discardThemeChanges = () => {
    setThemeForm(savedTheme);
    applyThemeColors(savedTheme);
    showToast("Unsaved color changes discarded", "success");
  };

  if (loading) return <AppShell title="Society Settings"><div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading settings...</p></div></AppShell>;
  if (loadError || !settings) return <AppShell title="Society Settings"><p className="text-brand-danger">{loadError ?? "Failed to load settings."}</p></AppShell>;

  return (
    <AppShell title="Society Settings">
      <div className="space-y-6 max-w-4xl">
        <AdminPageHeader
          eyebrow="Society administration"
          title="Society settings"
          description="Configure how your society operates — visitor approvals, billing rules, payment details, and branding."
          icon={<Settings className="h-6 w-6" />}
        />

        <div className="tabs pb-4">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={tab === t.id ? "tab tab-active" : "tab tab-inactive"}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Society info */}
        {tab === "general" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-2">Society Info</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-fg-secondary">Name:</span>
              <span className="ml-2 font-medium text-fg-primary">{settings.name}</span>
            </div>
            <div>
              <span className="text-fg-secondary">Status:</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${settings.status === "ACTIVE" ? "bg-approved-bg text-approved-fg" : "bg-denied-bg text-denied-fg"}`}>
                {settings.status}
              </span>
            </div>
          </div>
        </div>
        )}

        {/* Visitor settings */}
        {tab === "visitors" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-3">Visitor & Gate Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-fg-primary">
              <input type="checkbox" checked={visitorForm.visitorApprovalRequired}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorApprovalRequired: e.target.checked })} />
              <span>Require resident approval before visitor entry</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-fg-primary">
              <input type="checkbox" checked={visitorForm.guardCanApproveVisitors}
                onChange={(e) => setVisitorForm({ ...visitorForm, guardCanApproveVisitors: e.target.checked })} />
              <span>Guards can approve visitors directly (without resident confirmation)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Multi-villa approval mode</label>
              <select value={visitorForm.visitorMultiVillaApprovalMode}
                onChange={(e) => setVisitorForm({ ...visitorForm, visitorMultiVillaApprovalMode: e.target.value })}
                className="input max-w-xs">
                <option value="ANY_ONE_APPROVAL">Any one villa approves</option>
                <option value="ALL_MUST_APPROVE">All villas must approve</option>
              </select>
            </div>
            <button onClick={saveVisitor} disabled={savingVisitor} className="btn btn-primary flex items-center gap-1">
              <Save size={14} /> {savingVisitor ? "Saving…" : "Save Visitor Settings"}
            </button>
          </div>
        </div>
        )}

        {/* Maintenance billing mode (A8/A9) */}
        {tab === "billing" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-1">Maintenance billing mode</h3>
          <p className="text-sm text-fg-secondary mb-4">
            Choose one method for the society. Fixed applies the same amount to every villa each cycle.
            Sq ft calculates per villa as area × rate (villas without area fall back to their saved monthly amount).
          </p>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm text-fg-primary">
              <input
                type="radio"
                name="billingMode"
                checked={maintenanceBillingForm.maintenanceBillingMode === "FIXED"}
                onChange={() =>
                  setMaintenanceBillingForm((s) => ({ ...s, maintenanceBillingMode: "FIXED" }))
                }
              />
              Fixed amount per villa
            </label>
            <label className="flex items-center gap-2 text-sm text-fg-primary">
              <input
                type="radio"
                name="billingMode"
                checked={maintenanceBillingForm.maintenanceBillingMode === "SQFT"}
                onChange={() =>
                  setMaintenanceBillingForm((s) => ({ ...s, maintenanceBillingMode: "SQFT" }))
                }
              />
              Per sq ft (area × rate)
            </label>
          </div>
          {maintenanceBillingForm.maintenanceBillingMode === "FIXED" ? (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-fg-primary">Default fixed amount (₹)</label>
              <input
                type="number"
                min={1}
                step="0.01"
                className="input mt-1"
                value={maintenanceBillingForm.maintenanceFixedAmount}
                onChange={(e) =>
                  setMaintenanceBillingForm((s) => ({
                    ...s,
                    maintenanceFixedAmount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="mt-1 text-xs text-fg-tertiary">
                Pre-fills new billing cycles; you can still adjust per month when expenses change.
              </p>
            </div>
          ) : (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-fg-primary">Rate per sq ft (₹)</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className="input mt-1"
                value={maintenanceBillingForm.maintenanceSqftRate}
                onChange={(e) =>
                  setMaintenanceBillingForm((s) => ({
                    ...s,
                    maintenanceSqftRate: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="mt-1 text-xs text-fg-tertiary">
                Each villa due = villa area × rate. Ensure villa areas are set under Villas.
              </p>
            </div>
          )}
          <button
            onClick={saveMaintenanceBilling}
            disabled={savingMaintenanceBilling}
            className="btn btn-primary mt-4 flex items-center gap-1"
          >
            <Save size={14} /> {savingMaintenanceBilling ? "Saving…" : "Save billing mode"}
          </button>
        </div>
        )}

        {/* Late fee settings */}
        {tab === "billing" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-3">Late Fee Automation</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-fg-primary">Late fee percentage (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={lateFeeForm.lateFeePercentage}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeePercentage: parseFloat(e.target.value) || 0 })}
                className="input mt-1" />
              <p className="mt-0.5 text-xs text-fg-tertiary">0 = disabled. Typical: 1-5%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary">Fixed late fee (INR)</label>
              <input type="number" step="1" min="0" value={lateFeeForm.lateFeeFixedAmount}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, lateFeeFixedAmount: parseFloat(e.target.value) || 0 })}
                className="input mt-1" />
              <p className="mt-0.5 text-xs text-fg-tertiary">Applied only if percentage is 0</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary">Grace period (days)</label>
              <input type="number" min="0" max="90" value={lateFeeForm.maintenanceGracePeriodDays}
                onChange={(e) => setLateFeeForm({ ...lateFeeForm, maintenanceGracePeriodDays: parseInt(e.target.value) || 0 })}
                className="input mt-1" />
              <p className="mt-0.5 text-xs text-fg-tertiary">Days after due date before late fee</p>
            </div>
          </div>
          <button onClick={saveLateFee} disabled={savingLateFee} className="btn btn-primary mt-3 flex items-center gap-1">
            <Save size={14} /> {savingLateFee ? "Saving…" : "Save Late Fee Settings"}
          </button>
        </div>
        )}

        {/* UPI settings */}
        {tab === "billing" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-3">UPI Payment Settings</h3>
          <div>
            <label className="block text-sm font-medium text-fg-primary">UPI VPA</label>
            <input value={upiForm.upiVpa}
              onChange={(e) => setUpiForm({ upiVpa: e.target.value })}
              className="input mt-1 max-w-md"
              placeholder="e.g. society@okhdfc" />
            <p className="mt-1 text-xs text-fg-tertiary">
              Verified on save — use name@bank format (e.g. society@okhdfc, collection@yesbank).
            </p>
          </div>
          <button onClick={saveUpi} disabled={savingUpi} className="btn btn-primary mt-3 flex items-center gap-1">
            <Save size={14} /> {savingUpi ? "Saving…" : "Save UPI Settings"}
          </button>

          <div className="mt-5 border-t border-surface-border pt-4">
            <label className="block text-sm font-medium text-fg-primary">UPI QR Code</label>
            <p className="mt-0.5 text-xs text-fg-tertiary">
              Upload your bank/UPI app QR image. Shown to residents and on generated invoices. PNG, JPG or WEBP, up to 5 MB.
            </p>
            <div className="mt-2 flex items-start gap-4">
              {settings.upiQrCodeUrl ? (
                <img src={settings.upiQrCodeUrl} alt="UPI QR" className="h-32 w-32 rounded border border-surface-border object-contain" loading="lazy" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded border border-dashed border-surface-border text-xs text-fg-tertiary">
                  No QR uploaded
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={qrFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadImage(file, "qrImage", "/society-settings/upload-qr", setUploadingQr, qrFileRef, "QR code uploaded");
                    }
                  }}
                />
                <button
                  onClick={() => qrFileRef.current?.click()}
                  disabled={uploadingQr}
                  className="btn btn-secondary flex items-center gap-1"
                >
                  <Upload size={14} /> {uploadingQr ? "Uploading…" : settings.upiQrCodeUrl ? "Replace QR" : "Upload QR"}
                </button>
                {settings.upiQrCodeUrl && (
                  <button
                    onClick={() => removeImage("/society-settings/qr-code", "QR code removed")}
                    className="btn btn-ghost flex items-center gap-1 text-brand-danger"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Branding / letterhead */}
        {tab === "branding" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-1">Branding &amp; Letterhead</h3>
          <p className="text-xs text-fg-tertiary mb-3">
            Upload your society letterhead. It is used as the background for generated documents such as maintenance invoices.
            A US-Letter / A4 portrait image works best. PNG, JPG or WEBP, up to 10 MB.
          </p>
          <div className="flex items-start gap-4">
            {settings.letterheadUrl ? (
              <img src={settings.letterheadUrl} alt="Letterhead" className="h-44 w-auto max-w-[220px] rounded border border-surface-border object-contain" loading="lazy" />
            ) : (
              <div className="flex h-44 w-[170px] items-center justify-center rounded border border-dashed border-surface-border text-center text-xs text-fg-tertiary">
                No letterhead uploaded
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={letterheadFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadImage(file, "letterhead", "/society-settings/upload-letterhead", setUploadingLetterhead, letterheadFileRef, "Letterhead uploaded");
                  }
                }}
              />
              <button
                onClick={() => letterheadFileRef.current?.click()}
                disabled={uploadingLetterhead}
                className="btn btn-secondary flex items-center gap-1"
              >
                <Upload size={14} /> {uploadingLetterhead ? "Uploading…" : settings.letterheadUrl ? "Replace letterhead" : "Upload letterhead"}
              </button>
              {settings.letterheadUrl && (
                <button
                  onClick={() => removeImage("/society-settings/letterhead", "Letterhead removed")}
                  className="btn btn-ghost flex items-center gap-1 text-brand-danger"
                >
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Signature & stamp */}
        {tab === "branding" && (
        <div className="card card-body">
          <h3 className="font-semibold text-fg-primary mb-1">Authorised Signature &amp; Stamp</h3>
          <p className="text-xs text-fg-tertiary mb-4">
            Uploaded here, these are printed in the signature/stamp area of generated documents such as maintenance invoices.
            A transparent PNG works best. PNG, JPG or WEBP, up to 5 MB.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Signature */}
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Authorised signature</label>
              <div className="flex items-start gap-4">
                {settings.signatureUrl ? (
                  <img src={settings.signatureUrl} alt="Signature" className="h-20 w-36 rounded border border-surface-border bg-white object-contain p-1" loading="lazy" />
                ) : (
                  <div className="flex h-20 w-36 items-center justify-center rounded border border-dashed border-surface-border text-center text-xs text-fg-tertiary">
                    No signature
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={signatureFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImage(file, "signature", "/society-settings/upload-signature", setUploadingSignature, signatureFileRef, "Signature uploaded");
                      }
                    }}
                  />
                  <button
                    onClick={() => signatureFileRef.current?.click()}
                    disabled={uploadingSignature}
                    className="btn btn-secondary flex items-center gap-1"
                  >
                    <Upload size={14} /> {uploadingSignature ? "Uploading…" : settings.signatureUrl ? "Replace" : "Upload"}
                  </button>
                  {settings.signatureUrl && (
                    <button
                      onClick={() => removeImage("/society-settings/signature", "Signature removed")}
                      className="btn btn-ghost flex items-center gap-1 text-brand-danger"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Stamp */}
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Society stamp / seal</label>
              <div className="flex items-start gap-4">
                {settings.stampUrl ? (
                  <img src={settings.stampUrl} alt="Stamp" className="h-24 w-24 rounded border border-surface-border bg-white object-contain p-1" loading="lazy" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-surface-border text-center text-xs text-fg-tertiary">
                    No stamp
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={stampFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImage(file, "stamp", "/society-settings/upload-stamp", setUploadingStamp, stampFileRef, "Stamp uploaded");
                      }
                    }}
                  />
                  <button
                    onClick={() => stampFileRef.current?.click()}
                    disabled={uploadingStamp}
                    className="btn btn-secondary flex items-center gap-1"
                  >
                    <Upload size={14} /> {uploadingStamp ? "Uploading…" : settings.stampUrl ? "Replace" : "Upload"}
                  </button>
                  {settings.stampUrl && (
                    <button
                      onClick={() => removeImage("/society-settings/stamp", "Stamp removed")}
                      className="btn btn-ghost flex items-center gap-1 text-brand-danger"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* App splash image (mobile) */}
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">
                App splash image (mobile)
              </label>
              <p className="mb-2 text-xs text-fg-tertiary">
                Shown full-screen on the app launch, under a brand-color tint that follows the
                theme. Appears from the next app launch (cached on device).
              </p>
              <div className="flex items-start gap-4">
                {settings.splashUrl ? (
                  <img
                    src={settings.splashUrl}
                    alt="Splash"
                    className="h-40 w-24 rounded border border-surface-border object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-40 w-24 items-center justify-center rounded border border-dashed border-surface-border text-center text-xs text-fg-tertiary">
                    No splash
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={splashFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImage(file, "splash", "/society-settings/upload-splash", setUploadingSplash, splashFileRef, "Splash uploaded");
                      }
                    }}
                  />
                  <button
                    onClick={() => splashFileRef.current?.click()}
                    disabled={uploadingSplash}
                    className="btn btn-secondary flex items-center gap-1"
                  >
                    <Upload size={14} /> {uploadingSplash ? "Uploading…" : settings.splashUrl ? "Replace splash" : "Upload splash"}
                  </button>
                  {settings.splashUrl && (
                    <button
                      onClick={() => removeImage("/society-settings/splash", "Splash removed")}
                      className="btn btn-ghost flex items-center gap-1 text-brand-danger"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Theme & Branding Colors */}
        {tab === "branding" && (
        <div className="card overflow-hidden">
          <div className="card-header border-b border-surface-border bg-gradient-to-r from-brand-primary-light/40 to-transparent">
            <h3 className="font-semibold text-fg-primary">Theme &amp; Branding Colors</h3>
            <p className="mt-1 text-xs text-fg-tertiary">
              Pick colors for the mobile app and admin dashboard. Save to apply for all users in this society.
            </p>
          </div>

          <div className="card-body space-y-8">
            {/* Ready-made templates — one tap applies & saves for the whole society */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-fg-primary">Quick themes</p>
                <p className="text-xs text-fg-tertiary">
                  {THEME_TEMPLATES.length} professional palettes —{" "}
                  <span className="font-medium text-brand-primary">GatePass+</span> is the official
                  brand theme. Tap one to apply across the app and dashboard.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {THEME_TEMPLATES.map((t) => {
                  const active = activeTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={savingTheme}
                      onClick={() => void applyTemplate(t.colors)}
                      title={`Apply ${t.name}`}
                      className={`group overflow-hidden rounded-xl border text-left transition disabled:opacity-60 ${
                        active
                          ? "border-brand-primary ring-2 ring-brand-primary/40"
                          : "border-surface-border hover:border-brand-primary/50 hover:shadow-md"
                      }`}
                    >
                      <div
                        className="h-12 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${t.colors.gradientStart}, ${t.colors.gradientMiddle}, ${t.colors.gradientEnd})`,
                        }}
                      />
                      <div
                        className="flex items-center gap-1.5 px-2 py-2"
                        style={{ backgroundColor: t.colors.cardColor }}
                      >
                        {[t.colors.primaryColor, t.colors.secondaryColor, t.colors.accentColor].map(
                          (c, i) => (
                            <span
                              key={i}
                              className="h-3 w-3 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: c }}
                            />
                          ),
                        )}
                        <span
                          className="ml-auto truncate text-[11px] font-semibold"
                          style={{ color: t.colors.headingColor }}
                        >
                          {t.name}
                          {t.id === "gatepass-brand" ? (
                            <span className="ml-1 rounded bg-brand-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-primary">
                              Brand
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-fg-tertiary">
                Or fine-tune any individual color below after picking a template.
              </p>
            </div>

            {/* Live previews */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone size={15} className="text-brand-primary" />
                  <p className="text-sm font-semibold text-fg-primary">Mobile app preview</p>
                </div>
                <MobileAppThemePreview theme={themeForm} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Monitor size={15} className="text-brand-primary" />
                  <p className="text-sm font-semibold text-fg-primary">Admin dashboard preview</p>
                </div>
                <AdminDashboardThemePreview theme={themeForm} />
              </div>
            </div>

            {/* Color pickers — grouped by role (web + mobile) */}
            <div className="space-y-8">
              <ThemeColorGroup title="Brand">
                <ThemeColorField
                  label="Primary brand color"
                  usageKey="primaryColor"
                  value={themeForm.primaryColor}
                  defaultValue={DEFAULT_THEME_COLORS.primaryColor}
                  onChange={(v) => setThemeColor("primaryColor", v)}
                />
                <ThemeColorField
                  label="Primary hover / pressed"
                  usageKey="primaryHover"
                  value={themeForm.primaryHover}
                  defaultValue={DEFAULT_THEME_COLORS.primaryHover}
                  onChange={(v) => setThemeColor("primaryHover", v)}
                />
                <ThemeColorField
                  label="Primary light tint"
                  usageKey="primaryLight"
                  value={themeForm.primaryLight}
                  defaultValue={DEFAULT_THEME_COLORS.primaryLight}
                  onChange={(v) => setThemeColor("primaryLight", v)}
                />
                <ThemeColorField
                  label="Primary container"
                  usageKey="primaryContainer"
                  value={themeForm.primaryContainer}
                  defaultValue={DEFAULT_THEME_COLORS.primaryContainer}
                  onChange={(v) => setThemeColor("primaryContainer", v)}
                />
                <ThemeColorField
                  label="Secondary brand color"
                  usageKey="secondaryColor"
                  value={themeForm.secondaryColor}
                  defaultValue={DEFAULT_THEME_COLORS.secondaryColor}
                  onChange={(v) => setThemeColor("secondaryColor", v)}
                />
                <ThemeColorField
                  label="Accent / success color"
                  usageKey="accentColor"
                  value={themeForm.accentColor}
                  defaultValue={DEFAULT_THEME_COLORS.accentColor}
                  onChange={(v) => setThemeColor("accentColor", v)}
                />
                <ThemeColorField
                  label="Gradient start"
                  usageKey="gradientStart"
                  value={themeForm.gradientStart}
                  defaultValue={DEFAULT_THEME_COLORS.gradientStart}
                  onChange={(v) => setThemeColor("gradientStart", v)}
                />
                <ThemeColorField
                  label="Gradient middle"
                  usageKey="gradientMiddle"
                  value={themeForm.gradientMiddle}
                  defaultValue={DEFAULT_THEME_COLORS.gradientMiddle}
                  onChange={(v) => setThemeColor("gradientMiddle", v)}
                />
                <ThemeColorField
                  label="Gradient end"
                  usageKey="gradientEnd"
                  value={themeForm.gradientEnd}
                  defaultValue={DEFAULT_THEME_COLORS.gradientEnd}
                  onChange={(v) => setThemeColor("gradientEnd", v)}
                />
              </ThemeColorGroup>

              <ThemeColorGroup title="Buttons">
                <ThemeColorField
                  label="Primary button background"
                  usageKey="buttonBg"
                  value={themeForm.buttonBg}
                  defaultValue={DEFAULT_THEME_COLORS.buttonBg}
                  onChange={(v) => setThemeColor("buttonBg", v)}
                />
                <ThemeColorField
                  label="Primary button text"
                  usageKey="buttonText"
                  value={themeForm.buttonText}
                  defaultValue={DEFAULT_THEME_COLORS.buttonText}
                  onChange={(v) => setThemeColor("buttonText", v)}
                />
                <ThemeColorField
                  label="Secondary button background"
                  usageKey="secondaryButtonBg"
                  value={themeForm.secondaryButtonBg}
                  defaultValue={DEFAULT_THEME_COLORS.secondaryButtonBg}
                  onChange={(v) => setThemeColor("secondaryButtonBg", v)}
                />
                <ThemeColorField
                  label="Secondary button text"
                  usageKey="secondaryButtonText"
                  value={themeForm.secondaryButtonText}
                  defaultValue={DEFAULT_THEME_COLORS.secondaryButtonText}
                  onChange={(v) => setThemeColor("secondaryButtonText", v)}
                />
              </ThemeColorGroup>

              <ThemeColorGroup title="Text">
                <ThemeColorField
                  label="Heading / title text"
                  usageKey="headingColor"
                  value={themeForm.headingColor}
                  defaultValue={DEFAULT_THEME_COLORS.headingColor}
                  onChange={(v) => setThemeColor("headingColor", v)}
                />
                <ThemeColorField
                  label="Body / content text"
                  usageKey="bodyTextColor"
                  value={themeForm.bodyTextColor}
                  defaultValue={DEFAULT_THEME_COLORS.bodyTextColor}
                  onChange={(v) => setThemeColor("bodyTextColor", v)}
                />
                <ThemeColorField
                  label="Muted / helper text"
                  usageKey="mutedTextColor"
                  value={themeForm.mutedTextColor}
                  defaultValue={DEFAULT_THEME_COLORS.mutedTextColor}
                  onChange={(v) => setThemeColor("mutedTextColor", v)}
                />
              </ThemeColorGroup>

              <ThemeColorGroup title="Surfaces">
                <ThemeColorField
                  label="Page background"
                  usageKey="backgroundColor"
                  value={themeForm.backgroundColor}
                  defaultValue={DEFAULT_THEME_COLORS.backgroundColor}
                  onChange={(v) => setThemeColor("backgroundColor", v)}
                />
                <ThemeColorField
                  label="Card / panel surface"
                  usageKey="cardColor"
                  value={themeForm.cardColor}
                  defaultValue={DEFAULT_THEME_COLORS.cardColor}
                  onChange={(v) => setThemeColor("cardColor", v)}
                />
                <ThemeColorField
                  label="Field background"
                  usageKey="fieldBg"
                  value={themeForm.fieldBg}
                  defaultValue={DEFAULT_THEME_COLORS.fieldBg}
                  onChange={(v) => setThemeColor("fieldBg", v)}
                />
                <ThemeColorField
                  label="Field text"
                  usageKey="fieldText"
                  value={themeForm.fieldText}
                  defaultValue={DEFAULT_THEME_COLORS.fieldText}
                  onChange={(v) => setThemeColor("fieldText", v)}
                />
              </ThemeColorGroup>

              <ThemeColorGroup title="Borders & icons">
                <ThemeColorField
                  label="Border color"
                  usageKey="borderColor"
                  value={themeForm.borderColor}
                  defaultValue={DEFAULT_THEME_COLORS.borderColor}
                  onChange={(v) => setThemeColor("borderColor", v)}
                />
                <ThemeColorField
                  label="Icon color"
                  usageKey="iconColor"
                  value={themeForm.iconColor}
                  defaultValue={DEFAULT_THEME_COLORS.iconColor}
                  onChange={(v) => setThemeColor("iconColor", v)}
                />
                <ThemeColorField
                  label="Icon background"
                  usageKey="iconBg"
                  value={themeForm.iconBg}
                  defaultValue={DEFAULT_THEME_COLORS.iconBg}
                  onChange={(v) => setThemeColor("iconBg", v)}
                />
              </ThemeColorGroup>

              <ThemeColorGroup title="Semantic">
                <ThemeColorField
                  label="Warning color"
                  usageKey="warningColor"
                  value={themeForm.warningColor}
                  defaultValue={DEFAULT_THEME_COLORS.warningColor}
                  onChange={(v) => setThemeColor("warningColor", v)}
                />
                <ThemeColorField
                  label="Error / danger color"
                  usageKey="errorColor"
                  value={themeForm.errorColor}
                  defaultValue={DEFAULT_THEME_COLORS.errorColor}
                  onChange={(v) => setThemeColor("errorColor", v)}
                />
              </ThemeColorGroup>

              <ThemeColorGroup title="Admin-only (sidebar)">
                <ThemeColorField
                  label="Sidebar background"
                  usageKey="sidebarBg"
                  hint="Deep navy recommended — light colors make nav text hard to read"
                  value={themeForm.sidebarBg}
                  defaultValue={DEFAULT_THEME_COLORS.sidebarBg}
                  onChange={(v) => setThemeColor("sidebarBg", v)}
                />
                <ThemeColorField
                  label="Sidebar active item"
                  usageKey="sidebarActiveColor"
                  hint="Background for the selected menu item"
                  value={themeForm.sidebarActiveColor}
                  defaultValue={DEFAULT_THEME_COLORS.sidebarActiveColor}
                  onChange={(v) => setThemeColor("sidebarActiveColor", v)}
                />
              </ThemeColorGroup>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border bg-surface/95 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6">
              <div className="text-xs text-fg-tertiary">
                {themeDirty ? (
                  <span className="font-medium text-pending-fg">Unsaved color changes</span>
                ) : (
                  <span>Colors match saved settings</span>
                )}
                {themeHasInvalidColors ? (
                  <span className="ml-2 text-brand-danger">· Fix invalid values</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={previewTheme}
                  disabled={themeHasInvalidColors}
                  className="btn btn-ghost flex items-center gap-1.5"
                >
                  <Eye size={14} /> Preview on dashboard
                </button>
                {themeDirty ? (
                  <button
                    type="button"
                    onClick={discardThemeChanges}
                    disabled={savingTheme}
                    className="btn btn-ghost flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} /> Discard
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={resetTheme}
                  disabled={savingTheme}
                  className="btn btn-ghost"
                >
                  Reset to defaults
                </button>
                <button
                  type="button"
                  onClick={saveTheme}
                  disabled={savingTheme || !themeDirty || themeHasInvalidColors}
                  className="btn btn-primary flex items-center gap-1.5"
                >
                  <Save size={14} /> {savingTheme ? "Saving…" : "Save theme"}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </AppShell>
  );
}
