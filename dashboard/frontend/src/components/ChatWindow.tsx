import { useState, useRef, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  confirmation?: ConfirmationRequest;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

export interface ConfirmationRequest {
  type: "write" | "destructive";
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading: boolean;
  confirmation?: ConfirmationRequest | null;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function ToolCallBlock({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-md border border-surface-border bg-surface-dark/50 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-400 hover:text-gray-300"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-mono text-primary/80">{tool.name}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-border px-3 py-2">
              <pre className="whitespace-pre-wrap text-gray-500">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
              {tool.result && (
                <pre className="mt-2 whitespace-pre-wrap text-gray-400">
                  {tool.result}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmationBanner({
  confirmation,
}: {
  confirmation: ConfirmationRequest;
}) {
  const [typedConfirm, setTypedConfirm] = useState("");
  const isDestructive = confirmation.type === "destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-4 mb-3 rounded-lg border p-4 ${
        isDestructive
          ? "border-red-500/30 bg-red-500/10"
          : "border-yellow-500/30 bg-yellow-500/10"
      }`}
    >
      <div className="mb-3 flex items-start gap-2">
        {isDestructive ? (
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
        )}
        <div>
          <p
            className={`text-sm font-medium ${isDestructive ? "text-red-300" : "text-yellow-300"}`}
          >
            {isDestructive ? "Destructive Operation" : "Write Operation"}
          </p>
          <p className="mt-1 text-sm text-gray-300">
            {confirmation.description}
          </p>
        </div>
      </div>

      {isDestructive && (
        <input
          type="text"
          placeholder='Type "CONFIRM" to proceed'
          value={typedConfirm}
          onChange={(e) => setTypedConfirm(e.target.value)}
          className="mb-3 w-full rounded-md border border-red-500/30 bg-surface-dark px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500/60"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={confirmation.onConfirm}
          disabled={isDestructive && typedConfirm !== "CONFIRM"}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isDestructive
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-yellow-500 text-black hover:bg-yellow-400"
          }`}
        >
          {isDestructive ? "Delete" : "Confirm"}
        </button>
        <button
          onClick={confirmation.onCancel}
          className="rounded-md border border-surface-border px-4 py-1.5 text-sm text-gray-400 transition-colors hover:bg-surface-light"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

export function ChatWindow({
  messages,
  onSend,
  isLoading,
  confirmation,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 text-4xl">🦞</span>
            <h2 className="text-lg font-semibold text-white">
              PBXClaw Assistant
            </h2>
            <p className="mt-1 max-w-sm text-sm text-gray-400">
              Ask me to configure extensions, check call logs, manage SIP trunks,
              or troubleshoot your PBX. I can make changes with your approval.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary/20 text-gray-100"
                  : "bg-surface text-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.toolCalls?.map((tool) => (
                <ToolCallBlock key={tool.id} tool={tool} />
              ))}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex justify-start"
          >
            <div className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3 text-sm text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Confirmation banner */}
      {confirmation && <ConfirmationBanner confirmation={confirmation} />}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-surface-border bg-surface-dark p-4"
      >
        <div className="flex items-end gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask PBXClaw to manage your PBX..."
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-md bg-primary p-2 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
