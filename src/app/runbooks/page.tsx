"use client";

import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { api } from "@/lib/api";

type Runbook = {
  id: string;
  title: string;
  summary: string;
  docPath?: string;
  steps: string[];
};

export default function RunbooksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["runbooks"],
    queryFn: async () => {
      const res = await api.get<{ runbooks: Runbook[] }>("/admin-ops/runbooks");
      return res.data.runbooks;
    },
  });

  return (
    <AppShell title="Ops runbooks">
      <div className="space-y-6 p-6">
        <AdminPageHeader
          eyebrow="Operations"
          title="Ops runbooks"
          description="Self-serve troubleshooting for payments, reconciliation, and push delivery."
          icon={<BookOpen className="h-6 w-6" />}
        />
        {isLoading && <p className="text-fg-secondary">Loading…</p>}
        <div className="grid gap-4">
          {(data ?? []).map((rb) => (
            <section key={rb.id} className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold">{rb.title}</h2>
              </div>
              <div className="card-body text-sm space-y-2">
                <p className="text-fg-secondary">{rb.summary}</p>
                <ol className="list-decimal list-inside space-y-1">
                  {rb.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                {rb.docPath && (
                  <p className="text-xs text-fg-secondary pt-2">Deep dive: {rb.docPath}</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
