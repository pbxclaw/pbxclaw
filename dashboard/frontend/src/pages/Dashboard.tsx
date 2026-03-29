import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PhoneCall, Phone, Server, Bot } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

interface DashboardData {
  activeCalls: number;
  registeredExtensions: number;
  totalExtensions: number;
  freeswitchStatus: "running" | "stopped" | "error";
  freeswitchUptime: string;
  moltyStatus: "connected" | "disconnected" | "error";
}

const defaultData: DashboardData = {
  activeCalls: 0,
  registeredExtensions: 0,
  totalExtensions: 0,
  freeswitchStatus: "stopped",
  freeswitchUptime: "--",
  moltyStatus: "disconnected",
};

function statusColor(s: string): "green" | "yellow" | "red" | "gray" {
  if (s === "running" || s === "connected") return "green";
  if (s === "error") return "red";
  return "gray";
}

interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: { color: "green" | "yellow" | "red" | "gray"; label: string };
  delay?: number;
}

function StatCard({ title, value, subtitle, icon, badge, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-lg border border-surface-border bg-surface p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-gray-400">{icon}</span>
        {badge && <StatusBadge color={badge.color} label={badge.label} pulse={badge.color === "green"} />}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [fsStatus, extensions, calls] = await Promise.all([
        api.get<{
          status: string;
          uptime: string;
          molty_status: string;
        }>("/api/freeswitch/status"),
        api.get<{ extensions: Array<{ status: string }> }>("/api/extensions"),
        api.get<{ active_calls: number }>("/api/calls"),
      ]);

      const exts = extensions.extensions || [];
      setData({
        activeCalls: calls.active_calls || 0,
        registeredExtensions: exts.filter((e) => e.status === "registered").length,
        totalExtensions: exts.length,
        freeswitchStatus: fsStatus.status as DashboardData["freeswitchStatus"],
        freeswitchUptime: fsStatus.uptime || "--",
        moltyStatus: fsStatus.molty_status as DashboardData["moltyStatus"],
      });
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400">PBX system overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-surface-border bg-surface"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active Calls"
            value={data.activeCalls}
            icon={<PhoneCall size={20} />}
            badge={
              data.activeCalls > 0
                ? { color: "green", label: "In Progress" }
                : { color: "gray", label: "Idle" }
            }
            delay={0}
          />
          <StatCard
            title="Registered Extensions"
            value={`${data.registeredExtensions} / ${data.totalExtensions}`}
            subtitle="Devices online"
            icon={<Phone size={20} />}
            delay={0.05}
          />
          <StatCard
            title="FreeSWITCH"
            value={data.freeswitchUptime}
            subtitle="Uptime"
            icon={<Server size={20} />}
            badge={{
              color: statusColor(data.freeswitchStatus),
              label: data.freeswitchStatus,
            }}
            delay={0.1}
          />
          <StatCard
            title="Molty AI Agent"
            value={data.moltyStatus === "connected" ? "Online" : "Offline"}
            subtitle="AI call handler"
            icon={<Bot size={20} />}
            badge={{
              color: statusColor(data.moltyStatus),
              label: data.moltyStatus,
            }}
            delay={0.15}
          />
        </div>
      )}
    </div>
  );
}
