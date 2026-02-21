import { Phone, Clock } from "lucide-react";

export function TodaysCallCard() {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Today's Call</h3>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          10:30 AM
        </span>
        <span className="text-border">|</span>
        <span>12 min 34 sec</span>
      </div>

      <div className="bg-secondary rounded-md p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
        <p className="text-sm text-foreground leading-relaxed">
          Margaret discussed her morning walk and mentioned fatigue after gardening. She asked about her grandson's school play and appeared engaged throughout the conversation. Speech patterns consistent with baseline.
        </p>
      </div>
    </div>
  );
}
