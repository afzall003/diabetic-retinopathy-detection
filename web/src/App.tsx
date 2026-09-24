import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Analyze from "@/pages/Analyze";
import Results from "@/pages/Results";
import History from "@/pages/History";
import Model from "@/pages/Model";
import About from "@/pages/About";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/results/:analysisId" element={<Results />} />
          <Route path="/history" element={<History />} />
          <Route path="/model" element={<Model />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
