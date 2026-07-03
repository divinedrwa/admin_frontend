"use client";

import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Villa } from "@/types/villa";

interface VillasTableProps {
  villas: Villa[];
  sortedVillas: Villa[];
  loading: boolean;
  selectedVillaIds: Set<string>;
  toggleVillaSelected: (id: string) => void;
  toggleSelectAllVillas: () => void;
  onEdit: (villa: Villa) => void;
  onDelete: (id: string) => void;
  pgMeta: { total: number; limit: number; offset: number };
  onPageChange: (offset: number) => void;
}

export function VillasTable({
  villas,
  sortedVillas,
  loading,
  selectedVillaIds,
  toggleVillaSelected,
  toggleSelectAllVillas,
  onEdit,
  onDelete,
  pgMeta,
  onPageChange,
}: VillasTableProps) {
  if (loading) {
    return (
      <div className="table-wrapper">
        <div className="loading-state"><div className="loading-spinner w-10 h-10"></div><p className="loading-state-text">Loading villas...</p></div>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead className="table-head">
          <tr>
            <th scope="col" className="table-th w-10">
              {villas.length > 0 ? (
                <input type="checkbox" checked={villas.length > 0 && villas.every((v) => selectedVillaIds.has(v.id))} onChange={toggleSelectAllVillas} className="rounded border-surface-border" aria-label="Select all villas" />
              ) : null}
            </th>
            <th scope="col" className="table-th">Villa No.</th>
            <th scope="col" className="table-th">Block</th>
            <th scope="col" className="table-th">Floors</th>
            <th scope="col" className="table-th">Area (sq.ft.)</th>
            <th scope="col" className="table-th">Owner</th>
            <th scope="col" className="table-th">Maintenance</th>
            <th scope="col" className="table-th">Units</th>
            <th scope="col" className="table-th">Residents</th>
            <th scope="col" className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {villas.length === 0 ? (
            <tr>
              <td colSpan={10} className="table-td">
                <EmptyState
                  icon={<Building2 className="h-12 w-12" />}
                  title="No villas yet"
                  description="Click &quot;Add Villa&quot; above to register your first property."
                />
              </td>
            </tr>
          ) : (
            sortedVillas.map((villa) => (
              <tr key={villa.id} className="table-row">
                <td className="table-td align-middle">
                  <input type="checkbox" checked={selectedVillaIds.has(villa.id)} onChange={() => toggleVillaSelected(villa.id)} className="rounded border-surface-border" aria-label={`Select villa ${villa.villaNumber}`} />
                </td>
                <td className="table-td font-semibold">{villa.villaNumber}</td>
                <td className="table-td">{villa.block || "-"}</td>
                <td className="table-td">{villa.floors}</td>
                <td className="table-td">{villa.area}</td>
                <td className="table-td">
                  <div>
                    <div className="font-medium">{villa.ownerName}</div>
                    {villa.ownerPhone && <div className="text-xs text-fg-secondary mt-0.5">{villa.ownerPhone}</div>}
                  </div>
                </td>
                <td className="table-td font-semibold text-approved-solid">₹{villa.monthlyMaintenance}</td>
                <td className="table-td">{villa.units?.length ?? "—"}</td>
                <td className="table-td"><span className="badge badge-primary">{villa._count.users} active</span></td>
                <td className="table-td">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(villa)} className="btn btn-ghost text-xs px-2 py-1">Edit</button>
                    <button onClick={() => onDelete(villa.id)} className="btn btn-ghost text-brand-danger text-xs px-2 py-1">Delete</button>
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
