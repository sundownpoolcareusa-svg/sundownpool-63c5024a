import { Home, Map, Users, Menu } from "lucide-react";

export const TABS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/rotas", label: "Rotas", icon: Map },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/mais", label: "Mais", icon: Menu },
] as const;
