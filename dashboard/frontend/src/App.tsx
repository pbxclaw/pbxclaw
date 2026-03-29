import { Routes, Route, Navigate } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { Sidebar } from "./components/Sidebar";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Extensions from "./pages/Extensions";
import CallLogs from "./pages/CallLogs";
import Voicemail from "./pages/Voicemail";
import Providers from "./pages/Providers";
import FreeSwitchCLI from "./pages/FreeSwitchCLI";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden bg-surface-dark">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/extensions" element={<Extensions />} />
            <Route path="/call-logs" element={<CallLogs />} />
            <Route path="/voicemail" element={<Voicemail />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/fs-cli" element={<FreeSwitchCLI />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </main>
      </div>
    </AuthGate>
  );
}
