import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  X,
  TestTube,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

interface Provider {
  id: string;
  name: string;
  sip_server: string;
  port: number;
  username: string;
  outbound_proxy?: string;
  status: "registered" | "failed" | "unknown";
}

const emptyProvider = {
  name: "",
  sip_server: "",
  port: "5060",
  username: "",
  password: "",
  outbound_proxy: "",
};

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...emptyProvider });
  const [testing, setTesting] = useState<string | null>(null);

  async function fetchProviders() {
    try {
      const data = await api.get<{ providers: Provider[] }>("/api/providers");
      setProviders(data.providers || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProviders();
  }, []);

  async function handleAdd() {
    try {
      await api.post("/api/providers", {
        ...form,
        port: parseInt(form.port, 10) || 5060,
      });
      setShowAdd(false);
      setForm({ ...emptyProvider });
      fetchProviders();
    } catch {
      // handle error
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.del(`/api/providers/${id}`);
      fetchProviders();
    } catch {
      // handle error
    }
  }

  async function handleTest(id: string) {
    setTesting(id);
    try {
      await api.post(`/api/providers/${id}/test`);
      fetchProviders();
    } catch {
      // handle error
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">SIP Providers</h1>
          <p className="text-sm text-gray-400">
            Configure SIP trunks for PSTN connectivity
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus size={16} />
          Add Trunk
        </button>
      </div>

      {/* PBXClaw PSTN */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-medium text-white">PBXClaw PSTN</h3>
              <p className="text-sm text-gray-400">
                Native phone numbers and PSTN calling powered by PBXClaw
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Coming Soon
          </span>
        </div>
      </motion.div>

      {/* BYO Trunks */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-surface-border bg-surface"
            />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-surface-border bg-surface py-12 text-center">
          <Globe className="mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No SIP trunks configured</p>
          <p className="mt-1 text-sm text-gray-500">
            Add your BYO SIP trunk for outbound and inbound PSTN calling
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-5 py-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-white">{p.name}</p>
                  <StatusBadge
                    color={p.status === "registered" ? "green" : p.status === "failed" ? "red" : "gray"}
                    label={p.status}
                    pulse={p.status === "registered"}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {p.sip_server}:{p.port} &middot; {p.username}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(p.id)}
                  disabled={testing === p.id}
                  className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-surface-light hover:text-white disabled:opacity-40"
                >
                  {testing === p.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <TestTube size={12} />
                  )}
                  Test
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-lg border border-surface-border bg-surface p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Add SIP Trunk
                </h2>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    placeholder="Flowroute, Telnyx, VoIP.ms..."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm text-gray-400">
                      SIP Server
                    </label>
                    <input
                      type="text"
                      placeholder="sip.provider.com"
                      value={form.sip_server}
                      onChange={(e) =>
                        setForm({ ...form, sip_server: e.target.value })
                      }
                      className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-400">
                      Port
                    </label>
                    <input
                      type="text"
                      placeholder="5060"
                      value={form.port}
                      onChange={(e) =>
                        setForm({ ...form, port: e.target.value })
                      }
                      className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-gray-400">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="SIP auth username"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-400">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="SIP auth password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Outbound Proxy (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="proxy.provider.com"
                    value={form.outbound_proxy}
                    onChange={(e) =>
                      setForm({ ...form, outbound_proxy: e.target.value })
                    }
                    className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-md border border-surface-border px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-surface-light"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!form.name || !form.sip_server || !form.username}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add Trunk
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
