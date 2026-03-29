import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, CreditCard } from "lucide-react";
import { api } from "../lib/api";

type AuthStatus = "loading" | "valid" | "invalid" | "suspended";

interface AuthResponse {
  status: string;
  plan?: string;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    api
      .get<AuthResponse>("/api/auth/verify")
      .then((data) => {
        if (data.status === "suspended") {
          setStatus("suspended");
        } else {
          setStatus("valid");
        }
      })
      .catch(() => {
        setStatus("invalid");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-dark">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Connecting to PBXClaw...</p>
        </motion.div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-dark">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 max-w-md rounded-lg border border-surface-border bg-surface p-8 text-center"
        >
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="mb-2 text-xl font-semibold text-white">
            Authentication Required
          </h1>
          <p className="mb-6 text-sm text-gray-400">
            Your PBXClaw API key is missing or invalid. Please configure your API
            key or sign up for an account.
          </p>
          <a
            href="https://pbxclaw.com/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Sign Up at pbxclaw.com
          </a>
        </motion.div>
      </div>
    );
  }

  if (status === "suspended") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-dark">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 max-w-md rounded-lg border border-yellow-500/30 bg-surface p-8 text-center"
        >
          <CreditCard className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
          <h1 className="mb-2 text-xl font-semibold text-white">
            Account Suspended
          </h1>
          <p className="mb-6 text-sm text-gray-400">
            Your PBXClaw subscription is inactive. Please update your billing
            information to restore access.
          </p>
          <a
            href="https://pbxclaw.com/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-yellow-500 px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-yellow-400"
          >
            Update Billing
          </a>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
