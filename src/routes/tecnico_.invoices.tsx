import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyTechnician } from "@/lib/db";
import { InvoicesContent } from "@/routes/_authenticated/invoice";

export const Route = createFileRoute("/tecnico_/invoices")({
  component: TechnicianInvoicesPage,
});

function TechnicianInvoicesPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      const technician = await getMyTechnician();
      if (!technician?.can_manage_invoices) { navigate({ to: "/tecnico", search: { view: "rota" } }); return; }
      setReady(true);
    })();
  }, [navigate]);

  if (!ready) return null;

  return (
    <div className="dash min-h-screen bg-[var(--dash-bg)] pb-10">
      <header className="relative flex items-center justify-center border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-4">
        <button onClick={() => navigate({ to: "/tecnico", search: { view: "rota" } })} className="absolute left-4 text-[var(--dash-text-secondary)]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-extrabold text-[var(--dash-text)]">Invoices</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-3 sm:p-5">
        <InvoicesContent layout="technician" />
      </div>
    </div>
  );
}
