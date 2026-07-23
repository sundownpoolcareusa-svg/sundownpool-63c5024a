import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMyTechnician } from "@/lib/db";
import ownerIcon from "@/assets/owner-apple-touch-icon.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "apple-mobile-web-app-title", content: "Sundown" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "apple-touch-icon", href: ownerIcon },
      { rel: "icon", href: ownerIcon },
    ],
  }),
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
