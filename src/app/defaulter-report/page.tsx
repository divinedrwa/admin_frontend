"use client";

import { useQuery } from "@tanstack/react-query";
import { FileDown, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";

type DefaulterRow = {
  villaId: string;
  villaNumber: string;
  ownerName: string;
  totalOutstanding: number;
  pendingCycles: Array<{ cycleTitle: string; remainingDue: number; isOverdue: boolean }>;
};

type OutstandingResponse = {
  summary?: { totalOutstanding?: number; villaCount?: number };
  villas?: DefaulterRow[];
};

function exportCsv(rows: DefaulterRow[]) {
  const lines = ["Villa,Owner,Outstanding,Cycles"];
  for (const r of rows) {
    lines.push(
      `${r.villaNumber},"${r.ownerName.replace(/"/g, '""')}",${r.totalOutstanding},${r.pendingCycles.length}`,
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `defaulters-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DefaulterReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["outstandingDues"],
    queryFn: async () => {
      const res = await api.get<OutstandingResponse>("/maintenance-management/outstanding-dues");
      return res.data;
    },
  });

  const villas = data?.villas ?? [];

  return (
    <AppShell title="Defaulter report">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Finance"
          title="Defaulter report"
          description="Villas with pending maintenance across all open cycles (G2)."
          icon={<Users className="h-6 w-6" />}
        />
        {data?.summary && (
          <p className="text-sm text-fg-secondary">
            {data.summary.villaCount ?? villas.length} villas · ₹
            {(data.summary.totalOutstanding ?? 0).toLocaleString("en-IN")} total outstanding
          </p>
        )}
        <button
          type="button"
          className="btn btn-secondary inline-flex items-center gap-2"
          disabled={!villas.length}
          onClick={() => exportCsv(villas)}
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </button>
        {isLoading && <p>Loading…</p>}
        <div className="card overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">Villa</th>
                <th className="table-th">Owner</th>
                <th className="table-th text-right">Outstanding</th>
                <th className="table-th">Cycles</th>
              </tr>
            </thead>
            <tbody>
              {villas.map((v) => (
                <tr key={v.villaId}>
                  <td className="table-td">{v.villaNumber}</td>
                  <td className="table-td">{v.ownerName}</td>
                  <td className="table-td text-right">₹{v.totalOutstanding.toLocaleString("en-IN")}</td>
                  <td className="table-td">
                    {v.pendingCycles.map((c) => c.cycleTitle).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
