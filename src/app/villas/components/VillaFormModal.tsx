"use client";

import { VillaForm, UnitRow } from "@/types/villa";
import { suggestedOccupantUnitDefinitions } from "@/lib/occupantUnitCodes";
import { useMemo } from "react";

interface QuickTier { slotIndex: number; unitCode: string; label: string }

interface VillaFormModalProps {
  editingVilla: boolean;
  formData: VillaForm;
  setFormData: (fd: VillaForm) => void;
  unitRows: UnitRow[];
  setUnitRows: React.Dispatch<React.SetStateAction<UnitRow[]>>;
  assignedFloorTier: string;
  setAssignedFloorTier: (v: string) => void;
  primaryResidentId: string | null;
  primaryResidentName: string | null;
  quickAddTiers: QuickTier[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  ensureTierInUnitRows: (rows: UnitRow[], tier: { unitCode: string; label: string }) => UnitRow[];
}

export function VillaFormModal({
  editingVilla,
  formData,
  setFormData,
  unitRows,
  setUnitRows,
  assignedFloorTier,
  setAssignedFloorTier,
  primaryResidentId,
  primaryResidentName,
  quickAddTiers,
  submitting,
  onSubmit,
  onClose,
  ensureTierInUnitRows,
}: VillaFormModalProps) {
  const addUnitRow = useMemo(() => {
    return () => {
      const vn = formData.villaNumber.trim() || "VILLA";
      const floors = parseInt(formData.floors, 10) || 1;
      const used = new Set(unitRows.map((r) => r.unitCode.trim().toUpperCase()).filter(Boolean));
      const nextTier = suggestedOccupantUnitDefinitions(vn, floors).find((t) => !used.has(t.unitCode.toUpperCase()));
      setUnitRows((prev) => [...prev, nextTier ? { unitCode: nextTier.unitCode, label: nextTier.label } : { unitCode: "", label: "" }]);
    };
  }, [formData.villaNumber, formData.floors, unitRows, setUnitRows]);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-bold text-fg-primary">{editingVilla ? "Edit Villa" : "Create New Villa"}</h2>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Villa Number *</label>
              <input type="text" required value={formData.villaNumber} onChange={(e) => setFormData({ ...formData, villaNumber: e.target.value })} className="input" placeholder="e.g., V-001, V-002" disabled={editingVilla} />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Floors *</label>
              <input type="number" required min="1" max="10" value={formData.floors} onChange={(e) => setFormData({ ...formData, floors: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Block</label>
              <input type="text" value={formData.block} onChange={(e) => setFormData({ ...formData, block: e.target.value })} className="input" placeholder="e.g., A, B, C" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Area (sq. ft.) *</label>
              <input type="number" required min="0" step="0.01" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="input" placeholder="e.g., 1500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Monthly Maintenance (₹) *</label>
              <input type="number" required min="0" step="0.01" value={formData.monthlyMaintenance} onChange={(e) => setFormData({ ...formData, monthlyMaintenance: e.target.value })} className="input" placeholder="e.g., 5000" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Owner Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Owner Name *</label>
                <input type="text" required value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">Owner Email</label>
                <input type="email" value={formData.ownerEmail} onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })} className="input" placeholder="owner@example.com" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-fg-primary mb-1">Owner Phone</label>
              <input type="tel" value={formData.ownerPhone} onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })} className="input" placeholder="+91 9876543210" />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="text-lg font-medium">Occupant units / floors *</h3>
            <p className="text-xs text-fg-secondary">
              Each row is one occupant unit (code + label). Edit freely, add or remove rows, then save.
              Leave empty on create to auto-generate from the Floors count (e.g. V12_GF, V12_FF).
              {primaryResidentId
                ? " The floor selector sets which unit the primary resident (owner) uses; saving updates them automatically."
                : " Add an owner login (email on import or Users page) to assign a floor from here."}
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[260px] flex-1 max-w-lg">
                <label className="block text-xs text-fg-secondary mb-0.5">
                  Assigned floor (from Floors){primaryResidentName ? ` — ${primaryResidentName}` : ""}
                </label>
                <select
                  className="w-full border border-surface-border rounded px-2 py-1.5 text-sm bg-surface"
                  value={assignedFloorTier}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssignedFloorTier(v);
                    if (!v) return;
                    const idx = parseInt(v, 10);
                    const tier = quickAddTiers[idx];
                    if (!tier) return;
                    setUnitRows((prev) => ensureTierInUnitRows(prev, tier));
                  }}
                >
                  <option value="">{primaryResidentId ? "Not set / custom unit" : "Choose a floor tier…"}</option>
                  {quickAddTiers.map((tier, idx) => (
                    <option key={`tier-${idx}`} value={String(idx)}>{tier.label} ({tier.unitCode})</option>
                  ))}
                </select>
                {primaryResidentId && assignedFloorTier === "" && (
                  <p className="text-[11px] text-fg-secondary mt-1">Resident uses a custom unit — pick a tier above to reassign, or edit rows below.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {unitRows.map((row, idx) => (
                <div key={`unit-${idx}`} className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-fg-secondary mb-0.5">Unit code</label>
                    <input type="text" className="w-full border border-surface-border rounded px-2 py-1.5 text-sm" value={row.unitCode} onChange={(e) => { const next = [...unitRows]; next[idx] = { ...next[idx]!, unitCode: e.target.value }; setUnitRows(next); }} placeholder="e.g. V12_GF" />
                  </div>
                  <div className="flex-[2] min-w-[160px]">
                    <label className="block text-xs text-fg-secondary mb-0.5">Label</label>
                    <input type="text" className="w-full border border-surface-border rounded px-2 py-1.5 text-sm" value={row.label} onChange={(e) => { const next = [...unitRows]; next[idx] = { ...next[idx]!, label: e.target.value }; setUnitRows(next); }} placeholder="e.g. Ground floor" />
                  </div>
                  <button type="button" className="text-sm text-brand-danger hover:underline px-2" onClick={() => setUnitRows(unitRows.filter((_, i) => i !== idx))}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="text-sm text-brand-primary hover:underline" onClick={addUnitRow}>+ Add unit</button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Saving..." : editingVilla ? "Update property" : "Create property"}</button>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
