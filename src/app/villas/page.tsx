"use client";

import { Building2, FileSpreadsheet, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { sortByVillaNumber } from "@/utils/villaSort";
import {
  inferCanonicalTierIndex,
  nextFreeOccupantSlotIndex,
  occupantUnitCodeForFloorIndex,
  occupantUnitLabelForFloorIndex,
  suggestedOccupantUnitDefinitions,
} from "@/lib/occupantUnitCodes";

type ExtraUnitRow = {
  /** Slot for `occupantUnitCodeForFloorIndex(villaNumber, slotIndex)` (same scheme as import/API). */
  slotIndex: number;
  label: string;
  /** Quick-add tiers: fixed standard label. "+ Add unit": editable label, code still from slot. */
  canonicalLabel: boolean;
  /** When the DB unit code does not match any slot pattern, keep it on save. */
  preservedUnitCode?: string;
};

type VillaUnit = {
  id: string;
  unitCode: string;
  label: string;
  isDefault: boolean;
  sortOrder?: number;
};

type Villa = {
  id: string;
  propertyId?: string;
  villaNumber: string;
  floors: number;
  area: number;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: number;
  units?: VillaUnit[];
  billingAccount?: { id: string; scope: string };
  users: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  _count: {
    users: number;
  };
};

type VillaForm = {
  villaNumber: string;
  floors: string;
  area: string;
  block: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  monthlyMaintenance: string;
};

export default function VillasPage() {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVilla, setEditingVilla] = useState<Villa | null>(null);
  const [formData, setFormData] = useState<VillaForm>({
    villaNumber: "",
    floors: "1",
    area: "",
    block: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    monthlyMaintenance: "5000"
  });
  const [submitting, setSubmitting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedVillaIds, setSelectedVillaIds] = useState<Set<string>>(new Set());
  const [bulkDeletingVillas, setBulkDeletingVillas] = useState(false);
  const [extraUnits, setExtraUnits] = useState<ExtraUnitRow[]>([]);
  /** Controlled value for the "Quick add suggested unit" dropdown (always reset after pick). */
  const [quickAddUnit, setQuickAddUnit] = useState("");

  const loadVillas = () => {
    setLoading(true);
    api
      .get("/villas")
      .then((response) => setVillas(response.data.villas ?? []))
      .catch((error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        
        // Only show error toast for non-auth errors
        if (status !== 401 && status !== 403) {
          showToast(message ?? "Failed to load villas", "error");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Small delay to ensure token is loaded from localStorage
    const timer = setTimeout(() => {
      loadVillas();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleOpenForm = (villa?: Villa) => {
    if (villa) {
      setEditingVilla(villa);
      setFormData({
        villaNumber: villa.villaNumber,
        floors: villa.floors.toString(),
        area: villa.area.toString(),
        block: villa.block || "",
        ownerName: villa.ownerName,
        ownerEmail: villa.ownerEmail || "",
        ownerPhone: villa.ownerPhone || "",
        monthlyMaintenance: villa.monthlyMaintenance.toString()
      });
      const nonDefault =
        villa.units
          ?.filter((u) => u.unitCode !== "_DEFAULT")
          .map((u) => {
            const slot = inferCanonicalTierIndex(villa.villaNumber, u.unitCode);
            if (slot != null) {
              const def = occupantUnitLabelForFloorIndex(slot);
              const canonicalLabel = u.label.trim().toLowerCase() === def.trim().toLowerCase();
              return { slotIndex: slot, label: u.label, canonicalLabel };
            }
            return {
              slotIndex: -1,
              label: u.label,
              canonicalLabel: false,
              preservedUnitCode: u.unitCode,
            };
          }) ?? [];
      setExtraUnits(nonDefault);
      setQuickAddUnit("");
    } else {
      setEditingVilla(null);
      setFormData({
        villaNumber: "",
        floors: "1",
        area: "",
        block: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        monthlyMaintenance: "5000"
      });
      setExtraUnits([]);
      setQuickAddUnit("");
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVilla(null);
    setExtraUnits([]);
    setQuickAddUnit("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const floorsNum = Math.min(10, Math.max(1, parseInt(formData.floors, 10) || 1));
      const vn = formData.villaNumber.trim();

      if (extraUnits.some((u) => u.slotIndex >= 0) && !vn) {
        showToast("Enter villa number so unit codes can be generated.", "error");
        setSubmitting(false);
        return;
      }

      const unitsPayload: Array<{ unitCode: string; label: string; sortOrder: number }> = [];
      const seenLabels = new Set<string>();

      for (let rowIdx = 0; rowIdx < extraUnits.length; rowIdx++) {
        const u = extraUnits[rowIdx]!;
        if (u.slotIndex >= 0) {
          const label = u.canonicalLabel
            ? occupantUnitLabelForFloorIndex(u.slotIndex)
            : u.label.trim();
          if (!label) {
            showToast("Each unit needs a label. Fill in every custom unit before saving.", "error");
            setSubmitting(false);
            return;
          }
          const low = label.trim().toLowerCase();
          if (seenLabels.has(low)) {
            showToast("Duplicate unit labels are not allowed (case-insensitive).", "error");
            setSubmitting(false);
            return;
          }
          seenLabels.add(low);
          unitsPayload.push({
            unitCode: occupantUnitCodeForFloorIndex(vn, u.slotIndex),
            label,
            sortOrder: u.slotIndex * 10,
          });
        } else if (u.preservedUnitCode?.trim()) {
          const label = u.label.trim();
          if (!label) {
            showToast("Each unit needs a label.", "error");
            setSubmitting(false);
            return;
          }
          const low = label.toLowerCase();
          if (seenLabels.has(low)) {
            showToast("Duplicate unit labels are not allowed (case-insensitive).", "error");
            setSubmitting(false);
            return;
          }
          seenLabels.add(low);
          unitsPayload.push({
            unitCode: u.preservedUnitCode.trim(),
            label,
            sortOrder: 800 + rowIdx,
          });
        }
      }

      let finalUnits = unitsPayload;
      if (finalUnits.length < 1) {
        if (!vn) {
          showToast(
            "Enter villa number so occupant units can be generated from Floors, or add at least one unit manually.",
            "error",
          );
          setSubmitting(false);
          return;
        }
        finalUnits = suggestedOccupantUnitDefinitions(vn, floorsNum).map((d) => ({
          unitCode: d.unitCode,
          label: d.label,
          sortOrder: d.sortOrder,
        }));
      }

      const baseFields = {
        floors: floorsNum,
        area: parseFloat(formData.area),
        block: formData.block,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        monthlyMaintenance: parseFloat(formData.monthlyMaintenance),
        units: finalUnits,
      };

      if (editingVilla) {
        await api.patch(`/villas/${editingVilla.id}`, {
          ...baseFields,
          unitsSync: true,
        });
        showToast("Property updated successfully", "success");
      } else {
        await api.post("/villas", {
          villaNumber: formData.villaNumber.trim(),
          ...baseFields,
        });
        showToast("Property created successfully", "success");
      }

      handleCloseForm();
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save villa";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportVillasCsv = async () => {
    setExportingCsv(true);
    try {
      const { data } = await api.get<Blob>("/export/villas-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `villas-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Villas exported", "success");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Export failed";
      showToast(message, "error");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleVillaCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Please choose a .csv file", "error");
      return;
    }
    setImportingCsv(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{
        created: number;
        skipped: number;
        errors: { line: number; message: string }[];
        usersCreated?: number;
        ownerCredentials?: Array<{
          line: number;
          username: string;
          email: string;
          temporaryPassword?: string;
        }>;
      }>("/import/villas-csv", fd);
      const ownerPart =
        data.usersCreated != null && data.usersCreated > 0
          ? ` ${data.usersCreated} owner login(s) created.`
          : "";
      showToast(
        `Imported ${data.created} villa(s).${ownerPart} Skipped ${data.skipped}.`,
        data.errors?.length ? "error" : "success",
      );
      if (data.ownerCredentials?.length) {
        const credLines = data.ownerCredentials
          .map(
            (c) =>
              `Line ${c.line}: ${c.username} / ${c.email}` +
              (c.temporaryPassword != null ? ` — temp password: ${c.temporaryPassword}` : ""),
          )
          .join("\n");
        alert(`Save these generated owner passwords:\n\n${credLines}`);
      }
      if (data.errors?.length) {
        const preview = data.errors
          .slice(0, 8)
          .map((x) => `Line ${x.line}: ${x.message}`)
          .join("\n");
        alert(
          `${preview}${data.errors.length > 8 ? `\n… and ${data.errors.length - 8} more` : ""}`,
        );
      }
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Import failed";
      showToast(message, "error");
    } finally {
      setImportingCsv(false);
    }
  };

  const toggleVillaSelected = (id: string) => {
    setSelectedVillaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedVillas = useMemo(
    () => sortByVillaNumber(villas, (v) => v.villaNumber),
    [villas],
  );

  const quickAddTiers = useMemo(() => {
    const floors = parseInt(formData.floors, 10) || 1;
    const vn = formData.villaNumber.trim() || "VILLA";
    return suggestedOccupantUnitDefinitions(vn, floors).map((d, idx) => ({
      slotIndex: idx,
      unitCode: d.unitCode,
      label: d.label,
    }));
  }, [formData.villaNumber, formData.floors]);

  const toggleSelectAllVillas = () => {
    const allIds = villas.map((v) => v.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedVillaIds.has(id));
    if (allSelected) {
      setSelectedVillaIds(new Set());
    } else {
      setSelectedVillaIds(new Set(allIds));
    }
  };

  const handleDelete = async (villaId: string) => {
    if (!confirm("Are you sure you want to delete this villa?")) return;

    try {
      await api.delete(`/villas/${villaId}`);
      showToast("Villa deleted successfully", "success");
      setSelectedVillaIds((prev) => {
        const next = new Set(prev);
        next.delete(villaId);
        return next;
      });
      loadVillas();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete villa";
      showToast(message, "error");
    }
  };

  const handleBulkDeleteVillas = async () => {
    const ids = Array.from(selectedVillaIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} villa(s)? Villas with active residents cannot be removed until residents are moved out.`,
      )
    ) {
      return;
    }
    setBulkDeletingVillas(true);
    let deleted = 0;
    const failures: string[] = [];
    for (const id of ids) {
      try {
        await api.delete(`/villas/${id}`);
        deleted++;
      } catch (error: unknown) {
        const villa = villas.find((v) => v.id === id);
        const label = villa?.villaNumber ?? id;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Delete failed";
        failures.push(`${label}: ${message}`);
      }
    }
    setSelectedVillaIds(new Set());
    loadVillas();
    setBulkDeletingVillas(false);
    if (failures.length === 0) {
      showToast(`Deleted ${deleted} villa(s)`, "success");
    } else {
      showToast(`Deleted ${deleted}. ${failures.length} failed.`, "error");
      alert(failures.slice(0, 12).join("\n") + (failures.length > 12 ? `\n… and ${failures.length - 12} more` : ""));
    }
  };

  return (
    <AppShell title="Villas Management">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Property directory"
          title="Villas management"
          description={`Manage society properties, owners, billing-ready unit structures, and bulk villa imports from one operational workspace.${villas.length ? ` ${villas.length} properties are currently registered.` : ""}`}
          icon={<Building2 className="h-6 w-6" />}
          actions={
            <button onClick={() => handleOpenForm()} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Villa
            </button>
          }
        />

        <div className="card p-5 space-y-3 bg-brand-primary-light/50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-brand-primary" />
                <h3 className="font-semibold text-fg-primary">Import / export villas (CSV)</h3>
              </div>
              <p className="text-sm text-fg-secondary mt-1">
                Header row required:{" "}
                <code className="text-xs bg-surface px-1 rounded">
                  villaNumber,floors,area,block,ownerName,ownerEmail,ownerPhone,monthlyMaintenance
                </code>
                . Optional:{" "}
                <code className="text-xs bg-surface px-1 rounded">defaultFloor</code> (0 = ground, 1 = first, 2 =
                second, … — owner login is placed on that tier when units are auto-created from{" "}
                <code className="text-xs bg-surface px-1 rounded">floors</code>),{" "}
                <code className="text-xs bg-surface px-1 rounded">ownerUsername</code>,{" "}
                <code className="text-xs bg-surface px-1 rounded">ownerPassword</code> — when{" "}
                <code className="text-xs bg-surface px-1 rounded">ownerEmail</code> is set, an owner resident account is
                created for this society (username from email if omitted; password generated unless{" "}
                <code className="text-xs bg-surface px-1 rounded">ownerPassword</code> is at least 6 characters).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleExportVillasCsv}
                disabled={exportingCsv || villas.length === 0}
                className="text-sm font-medium bg-surface border border-surface-border text-fg-primary px-3 py-2 rounded hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {exportingCsv ? "Exporting…" : "Export villas CSV"}
              </button>
              <a
                href="/samples/villas-import-sample.csv"
                download="villas-import-sample.csv"
                className="text-sm font-medium text-brand-primary hover:underline whitespace-nowrap"
              >
                Sample CSV
              </a>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="bg-surface border border-surface-border text-info-fg px-3 py-2 rounded text-sm font-medium hover:bg-surface-elevated">
              {importingCsv ? "Importing…" : "Choose CSV file"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importingCsv}
              onChange={handleVillaCsvImport}
            />
          </label>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-bold text-fg-primary">
                {editingVilla ? "Edit Villa" : "Create New Villa"}
              </h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Villa Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.villaNumber}
                    onChange={(e) => setFormData({ ...formData, villaNumber: e.target.value })}
                    className="input"
                    placeholder="e.g., V-001, V-002"
                    disabled={!!editingVilla}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Floors *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.floors}
                    onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Block
                  </label>
                  <input
                    type="text"
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    className="input"
                    placeholder="e.g., A, B, C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Area (sq. ft.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="input"
                    placeholder="e.g., 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Monthly Maintenance (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.monthlyMaintenance}
                    onChange={(e) => setFormData({ ...formData, monthlyMaintenance: e.target.value })}
                    className="input"
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Owner Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-1">
                      Owner Email
                    </label>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="input"
                      placeholder="owner@example.com"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Owner Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="input"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="text-lg font-medium">Occupant units / floors *</h3>
                <p className="text-xs text-fg-secondary">
                  {editingVilla
                    ? "Unit codes follow the villa number using the same rules as CSV import (V03_GF, V03_FF, …). Quick-add tiers lock the standard label; + Add unit picks the next free slot and only the label is edited. Unrecognized legacy codes are kept as-is until you change them."
                    : "Codes are derived from the villa number (V03_GF, V03_FF, V03_SF, V03_F4, …). Leave the table empty to auto-create tiers for Floors, use Quick add, or + Add unit for an extra slot (label only — code is assigned automatically)."}
                  {" "}
                  Residents pick a unit on the Users page.
                </p>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="min-w-[260px] flex-1 max-w-lg">
                    <label className="block text-xs text-fg-secondary mb-0.5">
                      Quick add suggested unit (from Floors)
                    </label>
                    <select
                      className="w-full border border-surface-border rounded px-2 py-1.5 text-sm bg-surface"
                      value={quickAddUnit}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        if (!formData.villaNumber.trim()) {
                          showToast(
                            "Enter the villa number first — suggested codes use it (e.g. V12_GF).",
                            "error",
                          );
                          setQuickAddUnit("");
                          return;
                        }
                        const idx = parseInt(v, 10);
                        if (!quickAddTiers[idx]) {
                          setQuickAddUnit("");
                          return;
                        }
                        setExtraUnits((prev) => {
                          if (prev.some((x) => x.slotIndex === idx)) return prev;
                          return [
                            ...prev,
                            {
                              slotIndex: idx,
                              label: occupantUnitLabelForFloorIndex(idx),
                              canonicalLabel: true,
                            },
                          ];
                        });
                        setQuickAddUnit("");
                      }}
                    >
                      <option value="">Choose a floor tier…</option>
                      {quickAddTiers.map((tier, idx) => (
                        <option key={`tier-${idx}`} value={String(idx)}>
                          {tier.label} ({tier.unitCode})
                        </option>
                      ))}
                    </select>
                    {!formData.villaNumber.trim() && (
                      <p className="text-[11px] text-fg-secondary mt-1">
                        Villa number not set yet — preview uses VILLA_* codes until you fill it in above.
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {extraUnits.map((row, idx) => {
                    const vn = formData.villaNumber.trim();
                    const vnOrPlaceholder = vn || "VILLA";
                    const hasSlot = row.slotIndex >= 0;
                    const displayCode = hasSlot
                      ? occupantUnitCodeForFloorIndex(vnOrPlaceholder, row.slotIndex)
                      : (row.preservedUnitCode ?? "");
                    const displayLabel = row.canonicalLabel
                      ? occupantUnitLabelForFloorIndex(row.slotIndex)
                      : row.label;
                    return (
                      <div
                        key={hasSlot ? `s-${row.slotIndex}-${idx}` : `p-${idx}`}
                        className="flex flex-wrap gap-2 items-end"
                      >
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs text-fg-secondary mb-0.5">Unit code</label>
                          <input
                            type="text"
                            className="w-full border border-surface-border rounded px-2 py-1.5 text-sm bg-surface-elevated text-fg-secondary cursor-not-allowed"
                            value={displayCode}
                            readOnly
                          />
                          <p className="text-[10px] text-fg-secondary mt-0.5">Auto (same rules as import)</p>
                        </div>
                        <div className="flex-[2] min-w-[160px]">
                          <label className="block text-xs text-fg-secondary mb-0.5">Label</label>
                          <input
                            type="text"
                            className={`w-full border border-surface-border rounded px-2 py-1.5 text-sm ${
                              row.canonicalLabel
                                ? "bg-surface-elevated text-fg-secondary cursor-not-allowed"
                                : ""
                            }`}
                            value={displayLabel}
                            readOnly={row.canonicalLabel}
                            onChange={(e) => {
                              if (row.canonicalLabel) return;
                              const next = [...extraUnits];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setExtraUnits(next);
                            }}
                            placeholder="e.g. Basement / Annex"
                          />
                        </div>
                        <button
                          type="button"
                          className="text-sm text-brand-danger hover:underline px-2"
                          onClick={() => setExtraUnits(extraUnits.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="text-sm text-brand-primary hover:underline"
                  onClick={() =>
                    setExtraUnits((prev) => {
                      const used = new Set(
                        prev.filter((r) => r.slotIndex >= 0).map((r) => r.slotIndex),
                      );
                      const slot = nextFreeOccupantSlotIndex(used);
                      return [...prev, { slotIndex: slot, label: "", canonicalLabel: false }];
                    })
                  }
                >
                  + Add unit
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Saving..." : editingVilla ? "Update property" : "Create property"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {selectedVillaIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-denied-bg bg-denied-bg/90 px-4 py-3">
            <span className="text-sm text-fg-primary">
              {selectedVillaIds.size} villa{selectedVillaIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedVillaIds(new Set())}
                disabled={bulkDeletingVillas}
                className="text-sm px-3 py-1.5 rounded border border-surface-border bg-surface hover:bg-surface-background disabled:opacity-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteVillas}
                disabled={bulkDeletingVillas}
                className="text-sm px-3 py-1.5 rounded bg-brand-danger text-white hover:bg-brand-danger hover:opacity-90 disabled:opacity-50"
              >
                {bulkDeletingVillas ? "Deleting…" : "Delete selected"}
              </button>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading villas...</p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th w-10">
                    {villas.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={
                          villas.length > 0 &&
                          villas.every((v) => selectedVillaIds.has(v.id))
                        }
                        onChange={toggleSelectAllVillas}
                        className="rounded border-surface-border"
                        title="Select all villas"
                      />
                    ) : null}
                  </th>
                  <th className="table-th">Villa No.</th>
                  <th className="table-th">Block</th>
                  <th className="table-th">Floors</th>
                  <th className="table-th">Area (sq.ft.)</th>
                  <th className="table-th">Owner</th>
                  <th className="table-th">Maintenance</th>
                  <th className="table-th">Units</th>
                  <th className="table-th">Residents</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {villas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-td">
                      <div className="empty-state">
                        <span className="empty-state-icon">🏘️</span>
                        <p className="empty-state-title">No villas yet</p>
                        <p className="empty-state-text">Click &quot;Add Villa&quot; above to register your first property.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedVillas.map((villa) => (
                    <tr key={villa.id} className="table-row">
                      <td className="table-td align-middle">
                        <input
                          type="checkbox"
                          checked={selectedVillaIds.has(villa.id)}
                          onChange={() => toggleVillaSelected(villa.id)}
                          className="rounded border-surface-border"
                          aria-label={`Select villa ${villa.villaNumber}`}
                        />
                      </td>
                      <td className="table-td font-semibold">{villa.villaNumber}</td>
                      <td className="table-td">{villa.block || "-"}</td>
                      <td className="table-td">{villa.floors}</td>
                      <td className="table-td">{villa.area}</td>
                      <td className="table-td">
                        <div>
                          <div className="font-medium">{villa.ownerName}</div>
                          {villa.ownerPhone && (
                            <div className="text-xs text-fg-secondary mt-0.5">{villa.ownerPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="table-td font-semibold text-approved-solid">₹{villa.monthlyMaintenance}</td>
                      <td className="table-td">{villa.units?.length ?? "—"}</td>
                      <td className="table-td">
                        <span className="badge badge-primary">
                          {villa._count.users} active
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenForm(villa)}
                            className="btn btn-ghost text-xs px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(villa.id)}
                            className="btn btn-ghost text-brand-danger text-xs px-2 py-1"
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
