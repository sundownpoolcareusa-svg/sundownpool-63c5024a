import { Routes, Route } from "react-router-dom";
import { TechnicianView } from "@/pages/TechnicianView";
import { RoutePlanner } from "@/pages/RoutePlanner";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TechnicianView />} />
      <Route path="/planner" element={<RoutePlanner />} />
    </Routes>
  );
}
