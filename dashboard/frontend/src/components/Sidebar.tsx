import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  LayoutDashboard,
  Phone,
  PhoneCall,
  Voicemail,
  Globe,
  Terminal,
  Settings,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { to: "/chat", label: "Chat", icon: MessageSquare, primary: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/extensions", label: "Extensions", icon: Phone },
  { to: "/call-logs", label: "Call Logs", icon: PhoneCall },
  { to: "/voicemail", label: "Voicemail", icon: Voicemail },
  { to: "/providers", label: "Providers", icon: Globe },
  { to: "/fs-cli", label: "FS CLI", icon: Terminal },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-2xl">🦞</span>
        <span className="text-lg font-bold text-white">PBXClaw</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : item.primary
                    ? "text-primary/70 hover:bg-primary/5 hover:text-primary"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-surface-border px-4 py-3">
        <p className="text-xs text-gray-500">PBXClaw Alpha</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-3 z-50 rounded-lg bg-surface p-2 text-gray-400 md:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar md:hidden"
          >
            {navContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-sidebar md:flex">
        {navContent}
      </aside>
    </>
  );
}
