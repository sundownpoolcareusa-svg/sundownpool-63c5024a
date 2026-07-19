import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyTechnician } from "@/lib/db";
import { AppLogo } from "@/components/AppLogo";
import { toast } from "sonner";
import { Lock, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

async function destinationForCurrentUser() {
  const technician = await getMyTechnician();
  return technician ? "/tecnico" : "/invoice";
}

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) navigate({ to: await destinationForCurrentUser() });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: await destinationForCurrentUser() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dash min-h-screen" style={{ background: "linear-gradient(135deg, var(--dash-navy), var(--dash-navy-2))" }}>
      <div className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-md rounded-[22px] bg-white p-8" style={{ boxShadow: "0 30px 90px rgba(10,20,40,.4)" }}>
          <div className="flex justify-center p-4"><AppLogo style={{ width: 247, height: 64 }} /></div>
          <div className="flex items-center justify-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--dash-water-bg)" }}>
              <Lock className="h-4 w-4" style={{ color: "var(--dash-water-icon)" }} />
            </span>
            <h1 className="text-center text-2xl font-extrabold text-[var(--dash-text)]">Sign in</h1>
          </div>
          <p className="mt-1 text-center text-sm text-[var(--dash-text-muted)]">Sign in to manage your clients</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-[10px] border border-[var(--dash-border-input)] px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button disabled={loading} className="w-full rounded-[11px] bg-[var(--dash-navy)] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Please wait..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
