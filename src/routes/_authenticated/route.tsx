import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMyTechnician } from "@/lib/db";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const technician = await getMyTechnician();
    if (technician) throw redirect({ to: "/tecnico" });
    return { user: data.user };
  },
  component: () => (
    <div className="dash min-h-screen">
      <Outlet />
    </div>
  ),
});
