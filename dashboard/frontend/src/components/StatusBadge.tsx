import { motion } from "framer-motion";

type BadgeColor = "green" | "yellow" | "red" | "gray";

interface StatusBadgeProps {
  color: BadgeColor;
  label: string;
  pulse?: boolean;
}

const colorMap: Record<BadgeColor, { dot: string; bg: string; text: string }> = {
  green: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
  },
  yellow: {
    dot: "bg-yellow-400",
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
  },
  red: {
    dot: "bg-red-400",
    bg: "bg-red-400/10",
    text: "text-red-400",
  },
  gray: {
    dot: "bg-gray-400",
    bg: "bg-gray-400/10",
    text: "text-gray-400",
  },
};

export function StatusBadge({ color, label, pulse = false }: StatusBadgeProps) {
  const c = colorMap[color];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}
    >
      <motion.span
        className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`}
        animate={pulse ? { opacity: [1, 0.3, 1] } : {}}
        transition={pulse ? { duration: 1.5, repeat: Infinity } : {}}
      />
      {label}
    </span>
  );
}
