"use client";

import type { FinancialYearOption, FyFormData } from "./types";
import { fmtDateOnly } from "./types";

export interface FinancialYearModalProps {
  financialYears: FinancialYearOption[];
  fyForm: FyFormData;
  setFyForm: React.Dispatch<React.SetStateAction<FyFormData>>;
  fyEditId: string | null;
  setFyEditId: React.Dispatch<React.SetStateAction<string | null>>;
  onSubmitCreate: (e: React.FormEvent) => void;
  onSubmitUpdate: (e: React.FormEvent) => void;
  onEdit: (row: FinancialYearOption) => void;
  onDelete: (row: FinancialYearOption) => void;
}

export function FinancialYearModal({
  financialYears,
  fyForm,
  setFyForm,
  fyEditId,
  setFyEditId,
  onSubmitCreate,
  onSubmitUpdate,
  onEdit,
  onDelete,
}: FinancialYearModalProps) {
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-fg-primary">
            {fyEditId ? "Edit financial year" : "Create financial year"}
          </h2>
        </div>
        <form
          onSubmit={fyEditId ? onSubmitUpdate : onSubmitCreate}
          className="card-body grid gap-4 md:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-secondary">Label</span>
            <input
              className="input border rounded-lg px-3 py-2"
              placeholder="2026-27"
              value={fyForm.label}
              onChange={(e) => setFyForm((s) => ({ ...s, label: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-secondary">Start date</span>
            <input
              type="date"
              className="input border rounded-lg px-3 py-2"
              value={fyForm.startDate}
              onChange={(e) => setFyForm((s) => ({ ...s, startDate: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-secondary">End date</span>
            <input
              type="date"
              className="input border rounded-lg px-3 py-2"
              value={fyForm.endDate}
              onChange={(e) => setFyForm((s) => ({ ...s, endDate: e.target.value }))}
              required
            />
          </label>
          <div className="flex items-end">
            <div className="w-full flex gap-2">
              <button type="submit" className="btn btn-primary flex-1 text-sm">
                {fyEditId ? "Update financial year" : "Create financial year"}
              </button>
              {fyEditId && (
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => {
                    setFyEditId(null);
                    setFyForm({ label: "", startDate: "", endDate: "" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th scope="col" className="table-th">Label</th>
              <th scope="col" className="table-th">Start</th>
              <th scope="col" className="table-th">End</th>
              <th scope="col" className="table-th">Status</th>
              <th scope="col" className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {financialYears.map((fy) => (
              <tr key={fy.id} className="table-row">
                <td className="table-td font-medium text-fg-primary">{fy.label}</td>
                <td className="table-td">{fmtDateOnly(fy.startDate)}</td>
                <td className="table-td">{fmtDateOnly(fy.endDate)}</td>
                <td className="table-td">{fy.status}</td>
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-brand-primary text-xs font-semibold hover:underline"
                      onClick={() => onEdit(fy)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-brand-danger text-xs font-semibold hover:underline"
                      onClick={() => onDelete(fy)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {financialYears.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-fg-secondary">
                  No financial years created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
