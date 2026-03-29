import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, RefreshCw } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";

interface Extension {
  id: string;
  extension: string;
  name: string;
  status: "registered" | "offline";
  user_agent?: string;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function Extensions() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newExt, setNewExt] = useState({
    extension: "",
    name: "",
    password: generatePassword(),
  });

  async function fetchExtensions() {
    try {
      const data = await api.get<{ extensions: Extension[] }>("/api/extensions");
      setExtensions(data.extensions || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExtensions();
  }, []);

  async function handleAdd() {
    try {
      await api.post("/api/extensions", newExt);
      setShowAdd(false);
      setNewExt({ extension: "", name: "", password: generatePassword() });
      fetchExtensions();
    } catch {
      // handle error
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.del(`/api/extensions/${id}`);
      setDeleteId(null);
      fetchExtensions();
    } catch {
      // handle error
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Extensions</h1>
          <p className="text-sm text-gray-400">
            Manage SIP extensions and devices
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchExtensions()}
            className="rounded-lg border border-surface-border p-2 text-gray-400 transition-colors hover:bg-surface-light hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Plus size={16} />
            Add Extension
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3">Extension</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Loading extensions...
                </td>
              </tr>
            ) : extensions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No extensions configured. Click "Add Extension" to create one.
                </td>
              </tr>
            ) : (
              extensions.map((ext) => (
                <motion.tr
                  key={ext.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-surface-border bg-surface-dark hover:bg-surface"
                >
                  <td className="px-4 py-3 font-mono text-white">
                    {ext.extension}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{ext.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      color={ext.status === "registered" ? "green" : "gray"}
                      label={ext.status}
                      pulse={ext.status === "registered"}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {ext.user_agent || "--"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteId(ext.id)}
                      className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
              className="w-full max-w-md rounded-lg border border-surface-border bg-surface p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  New Extension
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
                    Extension Number
                  </label>
                  <input
                    type="text"
                    placeholder="1001"
                    value={newExt.extension}
                    onChange={(e) =>
                      setNewExt({ ...newExt, extension: e.target.value })
                    }
                    className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Front Desk"
                    value={newExt.name}
                    onChange={(e) =>
                      setNewExt({ ...newExt, name: e.target.value })
                    }
                    className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    SIP Password (auto-generated)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={newExt.password}
                    className="w-full rounded-md border border-surface-border bg-surface-dark px-3 py-2 font-mono text-sm text-gray-300 outline-none"
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
                  disabled={!newExt.extension || !newExt.name}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create Extension
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-lg border border-red-500/30 bg-surface p-6"
            >
              <h2 className="mb-2 text-lg font-semibold text-white">
                Delete Extension?
              </h2>
              <p className="mb-4 text-sm text-gray-400">
                This will remove the extension and disconnect any registered
                devices. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-md border border-surface-border px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-surface-light"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
