"use client";

import { FileSpreadsheet, ShieldCheck } from "lucide-react";

interface CsvImportExportProps {
  hasResidents: boolean;
  exportingResidents: boolean;
  importingResidents: boolean;
  importingGuards: boolean;
  onExportResidents: () => void;
  onImportResidents: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportGuards: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CsvImportExport({
  hasResidents,
  exportingResidents,
  importingResidents,
  importingGuards,
  onExportResidents,
  onImportResidents,
  onImportGuards,
}: CsvImportExportProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border border-approved-bg bg-approved-bg/80 p-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-approved-fg" />
              <h3 className="font-semibold text-fg-primary">Import / export residents (CSV)</h3>
            </div>
            <p className="text-xs text-fg-secondary mt-1">
              Columns:{" "}
              <code className="bg-surface px-1 rounded text-[11px]">
                username,name,email,password,phone,residentType,villaNumber,moveInDate
              </code>
              — optional:{" "}
              <code className="bg-surface px-1 rounded text-[11px]">defaultFloor</code> (0 = ground tier by
              sort order, 1 = next, …; omit column to use the property default unit).
            </p>
            <p className="text-xs text-fg-secondary mt-1">
              residentType: OWNER, TENANT, or FAMILY_MEMBER · if villaNumber is new for this society, a villa is
              created automatically (owner name = resident name; maintenance 0 until you edit it) · moveInDate:
              YYYY-MM-DD · when the CSV includes a <code className="bg-surface px-0.5 rounded">defaultFloor</code>{" "}
              column, each row can target a floor tier (0 = ground); leave the cell empty to use the property
              default unit · same phone can appear on multiple rows (one login per row — use unique username/email
              each time; mobile sign-in with phone may require username/email if numbers repeat)
            </p>
            <p className="text-xs text-pending-fg/90 mt-1">
              Exports leave the password column empty for security. Add passwords before re-importing to a new system.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportResidents}
              disabled={exportingResidents || !hasResidents}
              className="text-sm font-medium bg-surface border border-approved-bg text-fg-primary px-3 py-2 rounded hover:bg-approved-bg disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {exportingResidents ? "Exporting…" : "Export residents"}
            </button>
            <a href="/samples/residents-import-sample.csv" download="residents-import-sample.csv" className="text-sm font-medium text-approved-fg hover:underline text-center">
              Sample CSV
            </a>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="bg-surface border border-approved-bg text-fg-primary px-3 py-2 rounded text-sm font-medium hover:bg-approved-bg">
            {importingResidents ? "Importing…" : "Choose residents CSV"}
          </span>
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={importingResidents} onChange={onImportResidents} />
        </label>
      </div>

      <div className="rounded-lg border border-pending-bg bg-pending-bg/80 p-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-pending-fg" />
              <h3 className="font-semibold text-fg-primary">Import guards (CSV)</h3>
            </div>
            <p className="text-xs text-fg-secondary mt-1">
              Columns:{" "}
              <code className="bg-surface px-1 rounded text-[11px]">username,name,email,password,phone</code>
            </p>
          </div>
          <a href="/samples/guards-import-sample.csv" download="guards-import-sample.csv" className="text-sm font-medium text-fg-primary hover:underline shrink-0">
            Sample CSV
          </a>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="bg-surface border border-pending-bg text-fg-primary px-3 py-2 rounded text-sm font-medium hover:bg-pending-bg">
            {importingGuards ? "Importing…" : "Choose guards CSV"}
          </span>
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={importingGuards} onChange={onImportGuards} />
        </label>
      </div>
    </div>
  );
}
