"use client";

import type { BillingCycleRow, CycleFormData, FinancialYearOption, FyFormData } from "./types";
import { FinancialYearModal } from "./FinancialYearModal";
import { CycleFormModal } from "./CycleFormModal";
import { CashPaymentModal } from "./CashPaymentModal";

export interface BillingCycleTabProps {
  /* Financial year */
  financialYears: FinancialYearOption[];
  fyForm: FyFormData;
  setFyForm: React.Dispatch<React.SetStateAction<FyFormData>>;
  fyEditId: string | null;
  setFyEditId: React.Dispatch<React.SetStateAction<string | null>>;
  onCreateFinancialYear: (e: React.FormEvent) => void;
  onUpdateFinancialYear: (e: React.FormEvent) => void;
  onEditFinancialYear: (row: FinancialYearOption) => void;
  onDeleteFinancialYear: (row: FinancialYearOption) => void;

  /* Cycle form */
  createOpen: boolean;
  setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editId: string | null;
  setEditId: React.Dispatch<React.SetStateAction<string | null>>;
  form: CycleFormData;
  setForm: React.Dispatch<React.SetStateAction<CycleFormData>>;
  monthOptionsForSelectedFinancialYear: Array<{ value: string; label: string }>;
  creatingCycle: boolean;
  cycles: BillingCycleRow[];
  onCreateCycle: (e: React.FormEvent) => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  onOpenEdit: (c: BillingCycleRow) => void;
  onDeleteTarget: (c: BillingCycleRow) => void;
  statusBadge: (status: string) => React.ReactNode;
  onOpenCreate: () => void;
  onPublish?: (cycleId: string) => void;
  publishingId?: string | null;
  onUnpublish?: (cycleId: string) => void;
  unpublishingId?: string | null;

  /* Action cards */
  cycleOptions: Array<{ id: string; label: string }>;
  primaryMaintenanceUsers: Array<{
    id: string;
    name: string;
    maintenanceBillingRole?: "PRIMARY" | "EXCLUDED" | null;
    villa?: { villaNumber: string };
  }>;
  reopenId: string;
  setReopenId: React.Dispatch<React.SetStateAction<string>>;
  reopenEnd: string;
  setReopenEnd: React.Dispatch<React.SetStateAction<string>>;
  cashCycleId: string;
  setCashCycleId: React.Dispatch<React.SetStateAction<string>>;
  cashUserId: string;
  setCashUserId: React.Dispatch<React.SetStateAction<string>>;
  cashAmount: string;
  setCashAmount: React.Dispatch<React.SetStateAction<string>>;
  waiveCycleId: string;
  setWaiveCycleId: React.Dispatch<React.SetStateAction<string>>;
  waiveUserId: string;
  setWaiveUserId: React.Dispatch<React.SetStateAction<string>>;
  actionBusy: false | "reopen" | "cash" | "waive";
  onReopen: () => void;
  onCash: () => void;
  onWaive: () => void;
}

export function BillingCycleTab({
  financialYears,
  fyForm,
  setFyForm,
  fyEditId,
  setFyEditId,
  onCreateFinancialYear,
  onUpdateFinancialYear,
  onEditFinancialYear,
  onDeleteFinancialYear,
  createOpen,
  setCreateOpen,
  editId,
  setEditId,
  form,
  setForm,
  monthOptionsForSelectedFinancialYear,
  creatingCycle,
  cycles,
  onCreateCycle,
  onSubmitEdit,
  onOpenEdit,
  onDeleteTarget,
  statusBadge,
  onOpenCreate,
  onPublish,
  publishingId,
  onUnpublish,
  unpublishingId,
  cycleOptions,
  primaryMaintenanceUsers,
  reopenId,
  setReopenId,
  reopenEnd,
  setReopenEnd,
  cashCycleId,
  setCashCycleId,
  cashUserId,
  setCashUserId,
  cashAmount,
  setCashAmount,
  waiveCycleId,
  setWaiveCycleId,
  waiveUserId,
  setWaiveUserId,
  actionBusy,
  onReopen,
  onCash,
  onWaive,
}: BillingCycleTabProps) {
  return (
    <>
      <FinancialYearModal
        financialYears={financialYears}
        fyForm={fyForm}
        setFyForm={setFyForm}
        fyEditId={fyEditId}
        setFyEditId={setFyEditId}
        onSubmitCreate={onCreateFinancialYear}
        onSubmitUpdate={onUpdateFinancialYear}
        onEdit={onEditFinancialYear}
        onDelete={onDeleteFinancialYear}
      />

      <CycleFormModal
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        editId={editId}
        setEditId={setEditId}
        form={form}
        setForm={setForm}
        financialYears={financialYears}
        monthOptionsForSelectedFinancialYear={monthOptionsForSelectedFinancialYear}
        creatingCycle={creatingCycle}
        cycles={cycles}
        onCreateCycle={onCreateCycle}
        onSubmitEdit={onSubmitEdit}
        onOpenEdit={onOpenEdit}
        onDeleteTarget={onDeleteTarget}
        statusBadge={statusBadge}
        onOpenCreate={onOpenCreate}
        onPublish={onPublish}
        publishingId={publishingId}
        onUnpublish={onUnpublish}
        unpublishingId={unpublishingId}
      />

      <CashPaymentModal
        cycleOptions={cycleOptions}
        primaryMaintenanceUsers={primaryMaintenanceUsers}
        reopenId={reopenId}
        setReopenId={setReopenId}
        reopenEnd={reopenEnd}
        setReopenEnd={setReopenEnd}
        cashCycleId={cashCycleId}
        setCashCycleId={setCashCycleId}
        cashUserId={cashUserId}
        setCashUserId={setCashUserId}
        cashAmount={cashAmount}
        setCashAmount={setCashAmount}
        waiveCycleId={waiveCycleId}
        setWaiveCycleId={setWaiveCycleId}
        waiveUserId={waiveUserId}
        setWaiveUserId={setWaiveUserId}
        actionBusy={actionBusy}
        onReopen={onReopen}
        onCash={onCash}
        onWaive={onWaive}
      />
    </>
  );
}
