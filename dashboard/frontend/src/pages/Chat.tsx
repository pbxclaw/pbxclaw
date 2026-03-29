import { useState, useCallback } from "react";
import {
  ChatWindow,
  type ChatMessage,
  type ConfirmationRequest,
} from "../components/ChatWindow";
import { api } from "../lib/api";

interface ChatResponse {
  message: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: string;
  }>;
  requires_confirmation?: {
    type: "write" | "destructive";
    description: string;
    action_id: string;
  };
}

let msgId = 0;
function nextId() {
  return `msg-${++msgId}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(
    null
  );

  const handleSend = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const data = await api.post<ChatResponse>("/api/chat", {
          message: content,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        const assistantMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: data.message,
          toolCalls: data.tool_calls,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (data.requires_confirmation) {
          const conf = data.requires_confirmation;
          setConfirmation({
            type: conf.type,
            description: conf.description,
            onConfirm: async () => {
              setConfirmation(null);
              setIsLoading(true);
              try {
                const result = await api.post<ChatResponse>(
                  "/api/chat/confirm",
                  { action_id: conf.action_id }
                );
                setMessages((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    role: "assistant",
                    content: result.message,
                    toolCalls: result.tool_calls,
                  },
                ]);
              } catch (err) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: nextId(),
                    role: "assistant",
                    content: `Error: ${err instanceof Error ? err.message : "Action failed"}`,
                  },
                ]);
              } finally {
                setIsLoading(false);
              }
            },
            onCancel: () => {
              setConfirmation(null);
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "assistant",
                  content: "Operation cancelled.",
                },
              ]);
            },
          });
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : "Failed to send message"}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  return (
    <div className="h-full">
      <ChatWindow
        messages={messages}
        onSend={handleSend}
        isLoading={isLoading}
        confirmation={confirmation}
      />
    </div>
  );
}
