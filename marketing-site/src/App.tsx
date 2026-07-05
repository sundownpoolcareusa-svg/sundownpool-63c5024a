import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { ServicesPage } from "./pages/Services";
import { MaintenancePlansPage } from "./pages/MaintenancePlans";
import { AboutPage } from "./pages/About";
import { ServiceAreasPage } from "./pages/ServiceAreas";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/maintenance-plans" element={<MaintenancePlansPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/service-areas" element={<ServiceAreasPage />} />
    </Routes>
  );
}
