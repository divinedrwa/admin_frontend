"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";
import { parseApiError } from "@/utils/errorHandler";
import { showToast } from "@/components/Toast";

type TimelineEvent = {
  at: string;
  kind: string;
  status: string;
  detail: unknown;
};

export default function PaymentTimelinePage() {
  const [txnId, setTxnId] = useState("");
  const [queryId, setQueryId] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["paymentTimeline", queryId],
    enabled: queryId.length > 0,
    queryFn: async () => {
      const res = await api.get<{ transactionId: string; events: TimelineEvent[] }>(
        "/admin-ops/payment-timeline",
        { params: { transactionId: queryId } },
      );
      return res.data;
    },
  });

  function search(e: React.FormEvent) {
    e.preventDefault();
    const id = txnId.trim();
    if (!id) {
      showToast("Enter order or transaction id", "error");
      return;
    }
    setQueryId(id);
    void refetch();
  }

  return (
    <AppShell title="Payment timeline">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Operations"
          title="Payment timeline"
          description="Debug gateway orders: logs and ledger entries in chronological order (F2)."
          icon={<Search className="h-6 w-6" />}
        />
        <form onSubmit={search} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Order / transaction ID</label>
            <input
              className="input min-w-[280px]"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="order_xxx or PhonePe txn id"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Lookup
          </button>
        </form>
        {isLoading && <p className="text-fg-secondary">Loading…</p>}
        {isError && <p className="text-red-700">{parseApiError(new Error("lookup failed")).message}</p>}
        {data && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold">Timeline for {data.transactionId}</h2>
            </div>
            <div className="card-body">
              {data.events.length === 0 ? (
                <p className="text-fg-secondary text-sm">No events found for this id.</p>
              ) : (
                <ol className="space-y-3">
                  {data.events.map((ev, i) => (
                    <li key={`${ev.at}-${i}`} className="border-l-2 border-brand pl-3 text-sm">
                      <p className="font-medium">
                        {new Date(ev.at).toLocaleString()} — {ev.kind} ({ev.status})
                      </p>
                      <pre className="text-xs text-fg-secondary mt-1 overflow-x-auto">
                        {JSON.stringify(ev.detail, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
