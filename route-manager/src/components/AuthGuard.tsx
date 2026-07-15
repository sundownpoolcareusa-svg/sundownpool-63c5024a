import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function AuthGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!alive) return;
        setStatus(data.user ? "authed" : "anon");
      })
      .catch(() => {
        if (alive) setStatus("anon");
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session?.user ? "authed" : "anon");
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return <div className="grid min-h-screen place-items-center text-[var(--dash-text-muted)]">Carregando...</div>;
  }
  if (status === "anon") {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}
