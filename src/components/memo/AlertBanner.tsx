import { AlertTriangle, Play } from "lucide-react";

interface AlertBannerProps {
  show?: boolean;
}

export function AlertBanner({ show = true }: AlertBannerProps) {
  if (!show) return null;

  return (
    <div className="bg-memo-amber-light border border-memo-amber/20 rounded-lg p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-md bg-memo-amber/10 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 text-memo-amber" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Elevated pause frequency detected on today's call</p>
        <p className="text-xs text-muted-foreground mt-0.5">4.2 pauses/min vs 3.1 baseline. Review recommended.</p>
      </div>
      <button className="flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90 transition-opacity flex-shrink-0">
        <Play className="w-3 h-3" />
        Review
      </button>
    </div>
  );
}
