"use client";

import { Building2, FileSpreadsheet, Plus } from "lucide-react";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";
import { sortByVillaNumber } from "@/utils/villaSort";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  inferCanonicalTierIndex,
  occupantUnitCodeForFloorIndex,
  suggestedOccupantUnitDefinitions,
} from "@/lib/occupantUnitCodes";
import { Villa, VillaResident, VillaUnit, VillaForm, UnitRow } from "@/types/villa";
import { VillaFormModal } from "./components/VillaFormModal";
import { VillasTable } from "./components/VillasTable";
import { useVillas } from "@/hooks/useVillas";
import { useUrlPagination } from "@/hooks/useUrlPagination";

function pickPrimaryResident(villa: Villa): VillaResident | null {
  const residents = (villa.users ?? []).filter((u) => u.role === "RESIDENT" || u.role === "RESIDENT_CUM_ADMIN") as VillaResident[];
  if (residents.length === 0) return null;
  const ownerEmail = villa.ownerEmail?.trim().toLowerCase();
  if (ownerEmail) {
    const byEmail = residents.find((u) => u.email?.trim().toLowerCase() === ownerEmail);
    if (byEmail) return byEmail;
  }
  const owner = residents.find((u) => u.residentType === "OWNER");
  if (owner) return owner;
  return residents.find((u) => u.unitId) ?? residents[0] ?? null;
}

function tierIndexForResident(villaNumber: string, resident: VillaResident | null): string {
  if (!resident?.unit?.unitCode) return "";
  const idx = inferCanonicalTierIndex(villaNumber, resident.unit.unitCode);
  return idx != null ? String(idx) : "";
}

function ensureTierInUnitRows(
  rows: UnitRow[],
  tier: { unitCode: string; label: string },
): UnitRow[] {
  if (rows.some((r) => r.unitCode.trim().toUpperCase() === tier.unitCode.toUpperCase())) {
    return rows;
  }
  return [...rows, { unitCode: tier.unitCode, label: tier.label }];
}

export default function VillasPage() {
  return (
    <Suspense fallback={<AppShell title="Villas Management"><div className="loading-state"><div className="loading-spinner w-10 h-10" /></div></AppShell>}>
      <VillasPageInner />
    </Suspense>
  );
}

function VillasPageInner() {
  const queryClient = useQueryClient();
  const { queryParams, handlePageChange } = useUrlPagination();
  const { data, isLoading: loading } = useVillas(queryParams);
  const villas = data?.villas ?? [];
  const pgMeta = {
    total: data?.total ?? 0,
    limit: data?.limit ?? 50,
    offset: data?.offset ?? 0,
  };

  const invalidateVillas = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["villas"] });
  }, [queryClient]);

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
  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);
  /** Floor tier index (0 = ground, …) for owner / primary resident; synced to their unit on save. */
  const [assignedFloorTier, setAssignedFloorTier] = useState("");
  const [primaryResidentId, setPrimaryResidentId] = useState<string | null>(null);
  const [primaryResidentName, setPrimaryResidentName] = useState<string | null>(null);
  const { confirm, ConfirmUI } = useConfirm();

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
      const rows =
        villa.units
          ?.filter((u) => u.unitCode !== "_DEFAULT")
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((u) => ({ unitCode: u.unitCode, label: u.label })) ?? [];
      setUnitRows(rows);
      const primary = pickPrimaryResident(villa);
      setPrimaryResidentId(primary?.id ?? null);
      setPrimaryResidentName(primary?.name ?? null);
      setAssignedFloorTier(tierIndexForResident(villa.villaNumber, primary));
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
      setUnitRows([]);
      setPrimaryResidentId(null);
      setPrimaryResidentName(null);
      setAssignedFloorTier("");
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVilla(null);
    setUnitRows([]);
    setPrimaryResidentId(null);
    setPrimaryResidentName(null);
    setAssignedFloorTier("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const floorsNum = Math.min(10, Math.max(1, parseInt(formData.floors, 10) || 1));
      const vn = formData.villaNumber.trim();

      const unitsPayload: Array<{ unitCode: string; label: string; sortOrder: number }> = [];
      const seenLabels = new Set<string>();
      const seenCodes = new Set<string>();

      for (let rowIdx = 0; rowIdx < unitRows.length; rowIdx++) {
        const code = unitRows[rowIdx]!.unitCode.trim();
        const label = unitRows[rowIdx]!.label.trim();
        if (!code && !label) continue;
        if (!code || !label) {
          showToast("Each unit needs both a code and a label.", "error");
          setSubmitting(false);
          return;
        }
        const codeKey = code.toUpperCase();
        if (seenCodes.has(codeKey)) {
          showToast("Duplicate unit codes are not allowed.", "error");
          setSubmitting(false);
          return;
        }
        seenCodes.add(codeKey);
        const low = label.toLowerCase();
        if (seenLabels.has(low)) {
          showToast("Duplicate unit labels are not allowed (case-insensitive).", "error");
          setSubmitting(false);
          return;
        }
        seenLabels.add(low);
        unitsPayload.push({ unitCode: code, label, sortOrder: rowIdx * 10 });
      }

      let finalUnits = unitsPayload;
      if (finalUnits.length < 1) {
        if (!vn) {
          showToast(
            "Add at least one occupant unit, or enter a villa number so units can be generated from Floors.",
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
        const { data } = await api.patch<{ villa: { units?: VillaUnit[] } }>(`/villas/${editingVilla.id}`, {
          ...baseFields,
          unitsSync: true,
        });
        if (primaryResidentId && assignedFloorTier !== "") {
          const tierIdx = parseInt(assignedFloorTier, 10);
          if (Number.isFinite(tierIdx) && tierIdx >= 0) {
            const codeForTier =
              finalUnits[tierIdx]?.unitCode ?? occupantUnitCodeForFloorIndex(vn, tierIdx);
            const savedUnits = [...(data.villa?.units ?? [])]
              .filter((u) => u.unitCode !== "_DEFAULT")
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            const match =
              savedUnits.find(
                (u) => u.unitCode.trim().toUpperCase() === codeForTier.trim().toUpperCase(),
              ) ?? savedUnits[tierIdx];
            if (match?.id) {
              await api.patch(`/users/${primaryResidentId}`, { unitId: match.id });
            }
          }
        }
        showToast("Property updated successfully", "success");
      } else {
        await api.post("/villas", {
          villaNumber: formData.villaNumber.trim(),
          ...baseFields,
        });
        showToast("Property created successfully", "success");
      }

      handleCloseForm();
      invalidateVillas();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to save villa").message, "error");
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
      showToast(parseApiError(error, "Export failed").message, "error");
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
          .join("; ");
        showToast(`Generated owner passwords: ${credLines}`, "info");
      }
      if (data.errors?.length) {
        const preview = data.errors
          .slice(0, 5)
          .map((x) => `Line ${x.line}: ${x.message}`)
          .join("; ");
        showToast(
          `${preview}${data.errors.length > 5 ? ` … and ${data.errors.length - 5} more` : ""}`,
          "error",
        );
      }
      invalidateVillas();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Import failed").message, "error");
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
    if (!(await confirm({ title: "Delete villa", message: "Are you sure you want to delete this villa?", confirmLabel: "Delete" }))) return;

    try {
      await api.delete(`/villas/${villaId}`);
      showToast("Villa deleted successfully", "success");
      setSelectedVillaIds((prev) => {
        const next = new Set(prev);
        next.delete(villaId);
        return next;
      });
      invalidateVillas();
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to delete villa").message, "error");
    }
  };

  const handleBulkDeleteVillas = async () => {
    const ids = Array.from(selectedVillaIds);
    if (ids.length === 0) return;
    if (
      !(await confirm({
        title: "Delete selected villas",
        message: `Delete ${ids.length} villa(s)? Villas with active residents cannot be removed until residents are moved out.`,
        confirmLabel: "Delete",
      }))
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
        failures.push(`${label}: ${parseApiError(error, "Delete failed").message}`);
      }
    }
    setSelectedVillaIds(new Set());
    invalidateVillas();
    setBulkDeletingVillas(false);
    if (failures.length === 0) {
      showToast(`Deleted ${deleted} villa(s)`, "success");
    } else {
      showToast(`Deleted ${deleted}. ${failures.length} failed.`, "error");
      showToast(failures.slice(0, 5).join("; ") + (failures.length > 5 ? ` … and ${failures.length - 5} more` : ""), "error");
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
          <VillaFormModal
            editingVilla={!!editingVilla}
            formData={formData}
            setFormData={setFormData}
            unitRows={unitRows}
            setUnitRows={setUnitRows}
            assignedFloorTier={assignedFloorTier}
            setAssignedFloorTier={setAssignedFloorTier}
            primaryResidentId={primaryResidentId}
            primaryResidentName={primaryResidentName}
            quickAddTiers={quickAddTiers}
            submitting={submitting}
            onSubmit={handleSubmit}
            onClose={handleCloseForm}
            ensureTierInUnitRows={ensureTierInUnitRows}
          />
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

        <VillasTable
          villas={villas}
          sortedVillas={sortedVillas}
          loading={loading}
          selectedVillaIds={selectedVillaIds}
          toggleVillaSelected={toggleVillaSelected}
          toggleSelectAllVillas={toggleSelectAllVillas}
          onEdit={handleOpenForm}
          onDelete={handleDelete}
          pgMeta={pgMeta}
          onPageChange={handlePageChange}
        />
      </div>
      {ConfirmUI}
    </AppShell>
  );
}
