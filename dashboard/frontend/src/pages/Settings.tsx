import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ExternalLink,
  Key,
  CreditCard,
  Brain,
  ClipboardList,
} from "lucide-react";
import { api } from "../lib/api";

interface SettingsData {
  api_key: string;
  openclaw_url: string;
  local_llm_url: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    api_key: "",
    openclaw_url: "",
    local_llm_url: "",
  });
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [settingsData, auditData] = await Promise.all([
          api.get<SettingsData>("/api/settings"),
          api.get<{ entries: AuditEntry[] }>("/api/settings/audit"),
        ]);
        setSettings(settingsData);
        setAudit(auditData.entries || []);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.post("/api/settings", {
        openclaw_url: settings.openclaw_url,
        local_llm_url: settings.local_llm_url,
      });
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  function maskedKey(key: string): string {
    if (!key) return "Not configured";
    return key.slice(0, 8) + "..." + key.slice(-4);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-64 animate-pulse rounded-lg border border-surface-border bg-surface" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400">
          Manage your PBXClaw configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-surface-border bg-surface p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Key size={16} className="text-primary" />
            <h2 className="font-medium text-white">API Key</h2>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-surface-border bg-surface-dark px-3 py-2.5">
            <code className="flex-1 text-sm text-gray-300">
              {showKey ? settings.api_key : maskedKey(settings.api_key)}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-gray-500 transition-colors hover:text-gray-300"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </motion.section>

        {/* Billing */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-lg border border-surface-border bg-surface p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            <h2 className="font-medium text-white">Billing</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://pbxclaw.com/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
            >
              Manage Billing
              <ExternalLink size={14} />
            </a>
            <a
              href="https://pbxclaw.com/billing/cancel"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-surface-light hover:text-gray-300"
            >
              Cancel Subscription
            </a>
          </div>
        </motion.section>

        {/* AI Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-surface-border bg-surface p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Brain size={16} className="text-primary" />
            <h2 className="font-medium text-white">AI Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">
                OpenClaw API URL
              </label>
              <input
                type="text"
                placeholder="https://api.openclaw.ai/v1"
                value={settings.openclaw_url}
                onChange={(e) =>
                  setSettings({ ...settings, openclaw_url: e.target.value })
                }
                className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Local LLM URL (LM Studio, Ollama)
              </label>
              <input
                type="text"
                placeholder="http://localhost:1234/v1"
                value={settings.local_llm_url}
                onChange={(e) =>
                  setSettings({ ...settings, local_llm_url: e.target.value })
                }
                className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </motion.section>

        {/* Audit Log */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-lg border border-surface-border bg-surface p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            <h2 className="font-medium text-white">Recent Activity</h2>
          </div>

          {audit.length === 0 ? (
            <p className="text-sm text-gray-500">No recent admin actions</p>
          ) : (
            <div className="space-y-2">
              {audit.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md border border-surface-border bg-surface-dark px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-300">{entry.action}</p>
                    <p className="text-xs text-gray-500">{entry.details}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
