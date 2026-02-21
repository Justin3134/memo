import { AlertTriangle, Play } from "lucide-react";
import { motion } from "framer-motion";

interface AlertBannerProps {
  show?: boolean;
}

export function AlertBanner({ show = true }: AlertBannerProps) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-memo-red-light border border-memo-red/20 rounded-xl p-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-memo-red/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-memo-red" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Unusual speech pattern detected on today's call</p>
        <p className="text-xs text-muted-foreground mt-0.5">Increased pause frequency and lower speech rate compared to baseline</p>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 bg-memo-red text-destructive-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex-shrink-0">
        <Play className="w-3.5 h-3.5" />
        Listen to clip
      </button>
    </motion.div>
  );
}
