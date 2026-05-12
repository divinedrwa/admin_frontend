import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { BrowserSessionStatus } from "./BrowserSessionStatus";

type SupabaseRow = Record<string, unknown>;

const probeTable = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? "").trim();
const probeSelect = (process.env.NEXT_PUBLIC_SUPABASE_QUERY ?? "*").trim() || "*";
const parsedLimit = Number(process.env.NEXT_PUBLIC_SUPABASE_LIMIT ?? "10");
const probeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 50) : 10;

function isSupabaseRow(value: unknown): value is SupabaseRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default async function SupabaseExamplePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  const hasAuthSession = userError?.message !== "Auth session missing!";

  let rows: SupabaseRow[] = [];
  let rowsError: string | null = null;

  if (probeTable) {
    const { data, error } = await supabase.from(probeTable).select(probeSelect).limit(probeLimit);
    rows = Array.isArray(data) ? (data as unknown[]).filter(isSupabaseRow) : [];
    rowsError = error?.message ?? null;
  }

  return (
    <main className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-fg-primary">Supabase integration check</h1>
          <p className="text-sm text-fg-secondary">
            This route is isolated from the app&apos;s existing backend JWT login and is safe for validating
            Supabase config, cookies, and table access.
          </p>
        </header>

        <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold text-fg-primary">Server session</h2>
          {userError && hasAuthSession ? (
            <p className="text-sm text-danger-fg">Server session error: {userError.message}</p>
          ) : user ? (
            <div className="text-sm text-fg-secondary space-y-1">
              <p>Signed in as: {user.email ?? user.id}</p>
              <p>User ID: {user.id}</p>
            </div>
          ) : (
            <p className="text-sm text-fg-secondary">No server session detected.</p>
          )}
        </section>

        <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold text-fg-primary">Browser session</h2>
          <BrowserSessionStatus />
        </section>

        <section className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">Database probe</h2>
            <p className="text-sm text-fg-secondary">
              Reading up to {probeLimit} rows from `public.{probeTable || "..."}` using the server client.
            </p>
          </div>

          {!probeTable ? (
            <p className="text-sm text-fg-secondary">
              Set `NEXT_PUBLIC_SUPABASE_TABLE` in `.env.local` to probe a real table.
            </p>
          ) : rowsError ? (
            <div className="space-y-2">
              <p className="text-sm text-danger-fg">Query error: {rowsError}</p>
              <p className="text-sm text-fg-secondary">
                If this is a new project, run the SQL in `frontend/supabase/bootstrap.sql` inside the Supabase SQL Editor.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-fg-secondary">
              Connected successfully, but `public.{probeTable}` has no rows for the configured query.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <pre
                  key={String(row.id ?? index)}
                  className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100"
                >
                  {JSON.stringify(row, null, 2)}
                </pre>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
