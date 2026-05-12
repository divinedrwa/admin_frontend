"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

export function BrowserSessionStatus() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isMounted) return;
        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        setSession(data.session);
        setLoading(false);
      })
      .catch((unknownError: unknown) => {
        if (!isMounted) return;
        setError(unknownError instanceof Error ? unknownError.message : "Unknown browser session error");
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return <p className="text-sm text-fg-secondary">Checking browser session...</p>;
  }

  if (error) {
    return <p className="text-sm text-danger-fg">Browser session error: {error}</p>;
  }

  if (!session?.user) {
    return <p className="text-sm text-fg-secondary">No browser session detected.</p>;
  }

  return (
    <div className="text-sm text-fg-secondary space-y-1">
      <p>Signed in as: {session.user.email ?? session.user.id}</p>
      <p>Session expires at: {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "Unknown"}</p>
    </div>
  );
}
