"use client";

import { GridSummary } from "./types";

interface MaintenanceStatsCardsProps {
  summary: GridSummary;
}

export function MaintenanceStatsCards({ summary }: MaintenanceStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="stat-card bg-brand-primary-light">
        <div className="stat-card-label text-brand-primary">Total Villas</div>
        <div className="stat-card-value text-lg text-fg-primary">{summary.totalVillas}</div>
      </div>
      <div className="stat-card bg-approved-bg">
        <div className="stat-card-label text-approved-fg">Paid</div>
        <div className="stat-card-value text-lg text-fg-primary">{summary.paidCount}</div>
      </div>
      <div className="stat-card bg-pending-bg">
        <div className="stat-card-label text-pending-fg">Unpaid</div>
        <div className="stat-card-value text-lg text-fg-primary">{summary.unpaidCount}</div>
      </div>
      <div className="stat-card bg-denied-bg">
        <div className="stat-card-label text-denied-fg">Overdue</div>
        <div className="stat-card-value text-lg text-fg-primary">{summary.overdueCount}</div>
      </div>
      <div className="stat-card bg-brand-primary-light">
        <div className="stat-card-label text-brand-primary">Collection</div>
        <div className="stat-card-value text-lg text-fg-primary">{summary.collectionRate}%</div>
      </div>
      {(summary.excludedCount ?? 0) > 0 && (
        <div className="stat-card bg-surface-elevated">
          <div className="stat-card-label text-fg-tertiary">Excluded</div>
          <div className="stat-card-value text-lg text-fg-primary">{summary.excludedCount}</div>
        </div>
      )}
    </div>
  );
}
