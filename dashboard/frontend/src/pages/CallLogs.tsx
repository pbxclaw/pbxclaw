import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

interface CallRecord {
  id: string;
  timestamp: string;
  direction: "inbound" | "outbound";
  caller: string;
  callee: string;
  duration: number;
  status: "answered" | "missed" | "busy" | "failed";
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function callStatusColor(
  status: string
): "green" | "yellow" | "red" | "gray" {
  switch (status) {
    case "answered":
      return "green";
    case "missed":
      return "red";
    case "busy":
      return "yellow";
    default:
      return "gray";
  }
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "inbound") return <PhoneIncoming size={14} className="text-primary" />;
  return <PhoneOutgoing size={14} className="text-emerald-400" />;
}

export default function CallLogs() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function fetchCalls() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      const data = await api.get<{ calls: CallRecord[] }>(
        `/api/calls/history${qs ? `?${qs}` : ""}`
      );
      setCalls(data.calls || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCalls();
  }, [dateFrom, dateTo]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Call Logs</h1>
        <p className="text-sm text-gray-400">Call history and records</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search by extension or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCalls()}
            className="w-full rounded-md border border-surface-border bg-surface py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-gray-300 outline-none focus:border-primary"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-gray-300 outline-none focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Loading call records...
                </td>
              </tr>
            ) : calls.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No call records found.
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <motion.tr
                  key={call.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-surface-border bg-surface-dark hover:bg-surface"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                    {formatTime(call.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <DirectionIcon direction={call.direction} />
                      <span className="text-xs text-gray-400">
                        {call.direction}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {call.caller}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {call.callee}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      color={callStatusColor(call.status)}
                      label={call.status}
                    />
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
