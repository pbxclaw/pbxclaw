import { TerminalComponent } from "../components/Terminal";
import { Terminal } from "lucide-react";

export default function FreeSwitchCLI() {
  return (
    <div className="flex h-full flex-col">
      {/* Info bar */}
      <div className="flex items-center gap-3 border-b border-surface-border bg-surface px-5 py-3">
        <Terminal size={16} className="text-primary" />
        <div>
          <h1 className="text-sm font-medium text-white">
            FreeSWITCH CLI
          </h1>
          <p className="text-xs text-gray-500">
            Real-time FreeSWITCH call flow logs
          </p>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <TerminalComponent className="h-full" />
      </div>
    </div>
  );
}
