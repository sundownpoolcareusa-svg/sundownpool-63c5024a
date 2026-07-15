import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { Auth } from "@/pages/Auth";
import { Home } from "@/pages/Home";
import { RoutesPage } from "@/pages/Routes";
import { RouteDetails } from "@/pages/RouteDetails";
import { ClientsList } from "@/pages/ClientsList";
import { ClientDetails } from "@/pages/ClientDetails";
import { NewClient } from "@/pages/NewClient";
import { More } from "@/pages/More";
import { Technicians } from "@/pages/Technicians";

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
      <Route path="/rotas" element={<AuthGuard><RoutesPage /></AuthGuard>} />
      <Route path="/rotas/:routeId" element={<AuthGuard><RouteDetails /></AuthGuard>} />
      <Route path="/clientes" element={<AuthGuard><ClientsList /></AuthGuard>} />
      <Route path="/clientes/novo" element={<AuthGuard><NewClient /></AuthGuard>} />
      <Route path="/clientes/:clientId" element={<AuthGuard><ClientDetails /></AuthGuard>} />
      <Route path="/clientes/:clientId/editar" element={<AuthGuard><NewClient /></AuthGuard>} />
      <Route path="/mais" element={<AuthGuard><More /></AuthGuard>} />
      <Route path="/mais/tecnicos" element={<AuthGuard><Technicians /></AuthGuard>} />
    </Routes>
  );
}
