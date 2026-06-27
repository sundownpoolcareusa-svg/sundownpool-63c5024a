import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLogo } from "@/components/AppLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/invoice" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/invoice" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--brand-navy)]">
      <div className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex justify-center rounded-lg bg-slate-900 p-4"><AppLogo /></div>
          <h1 className="mt-6 text-center text-2xl font-extrabold text-slate-900">Entrar</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Acesse sua conta para gerenciar clientes</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <button disabled={loading} className="w-full rounded-md bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
