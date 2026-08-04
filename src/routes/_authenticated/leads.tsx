import { createFileRoute } from "@tanstack/react-router";
import { ClientesPage } from "./clientes";

export const Route = createFileRoute("/_authenticated/leads")({
  component: () => <ClientesPage mode="leads" />,
});
