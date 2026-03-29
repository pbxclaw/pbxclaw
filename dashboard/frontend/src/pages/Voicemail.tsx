import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Trash2, Voicemail as VoicemailIcon } from "lucide-react";
import { api } from "../lib/api";

interface VoicemailMessage {
  id: string;
  extension: string;
  caller: string;
  timestamp: string;
  duration: number;
  audio_url: string;
  read: boolean;
}

interface GroupedVoicemail {
  extension: string;
  messages: VoicemailMessage[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function VoicemailItem({
  msg,
  onDelete,
}: {
  msg: VoicemailMessage;
  onDelete: (id: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function togglePlay() {
    if (!audioRef.current) {
      audioRef.current = new Audio(msg.audio_url);
      audioRef.current.onended = () => setPlaying(false);
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
        msg.read
          ? "border-surface-border bg-surface-dark"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <button
        onClick={togglePlay}
        className="shrink-0 rounded-full bg-primary/10 p-2.5 text-primary transition-colors hover:bg-primary/20"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">
          From: <span className="font-mono">{msg.caller}</span>
        </p>
        <p className="text-xs text-gray-500">
          {formatTime(msg.timestamp)} &middot; {formatDuration(msg.duration)}
        </p>
      </div>

      {!msg.read && (
        <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
          New
        </span>
      )}

      <button
        onClick={() => onDelete(msg.id)}
        className="shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

export default function Voicemail() {
  const [groups, setGroups] = useState<GroupedVoicemail[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchVoicemail() {
    try {
      const data = await api.get<{ voicemails: VoicemailMessage[] }>(
        "/api/voicemail"
      );
      const msgs = data.voicemails || [];

      // Group by extension
      const map = new Map<string, VoicemailMessage[]>();
      for (const msg of msgs) {
        if (!map.has(msg.extension)) map.set(msg.extension, []);
        map.get(msg.extension)!.push(msg);
      }

      setGroups(
        Array.from(map.entries()).map(([extension, messages]) => ({
          extension,
          messages,
        }))
      );
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVoicemail();
  }, []);

  async function handleDelete(id: string) {
    try {
      await api.del(`/api/voicemail/${id}`);
      fetchVoicemail();
    } catch {
      // handle error
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Voicemail</h1>
        <p className="text-sm text-gray-400">Voicemail inbox by extension</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-surface-border bg-surface"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <VoicemailIcon className="mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">No voicemail messages</p>
          <p className="mt-1 text-sm text-gray-500">
            Messages will appear here when callers leave voicemail
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.extension}>
              <h2 className="mb-3 text-sm font-medium text-gray-400">
                Extension {group.extension}
                <span className="ml-2 text-xs text-gray-500">
                  ({group.messages.length} message
                  {group.messages.length !== 1 ? "s" : ""})
                </span>
              </h2>
              <div className="space-y-2">
                {group.messages.map((msg) => (
                  <VoicemailItem
                    key={msg.id}
                    msg={msg}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
