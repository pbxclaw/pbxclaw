import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  className?: string;
}

export function TerminalComponent({ className = "" }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      disableStdin: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: "#0f1117",
        foreground: "#e5e7eb",
        cursor: "#06b6d4",
        selectionBackground: "#06b6d433",
        black: "#1a1d27",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e5e7eb",
      },
      scrollback: 5000,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    term.writeln("\x1b[36m[PBXClaw]\x1b[0m FreeSWITCH CLI Log Viewer");
    term.writeln("\x1b[90mConnecting to WebSocket...\x1b[0m");
    term.writeln("");

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/freeswitch-cli`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        term.writeln("\x1b[32m[Connected]\x1b[0m Receiving live FreeSWITCH events\n");
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onclose = () => {
        setConnected(false);
        term.writeln("\n\x1b[33m[Disconnected]\x1b[0m Reconnecting in 3s...");
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    const handleResize = () => {
      fitRef.current?.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      wsRef.current?.close();
      term.dispose();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute right-3 top-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
            connected
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-yellow-400/10 text-yellow-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-yellow-400"}`}
          />
          {connected ? "Live" : "Reconnecting"}
        </span>
      </div>
    </div>
  );
}
