import { Phone, Clock } from "lucide-react";

export function TodaysCallCard() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-memo-sage-light flex items-center justify-center">
          <Phone className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground">Today's Call</h3>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          10:30 AM
        </span>
        <span className="text-border">|</span>
        <span>12 min 34 sec</span>
      </div>

      <div className="bg-secondary/50 rounded-lg p-4">
        <p className="text-sm font-medium text-secondary-foreground mb-1">Summary</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Margaret talked about her morning walk to the park. She mentioned feeling a bit tired after gardening yesterday. 
          She asked about her grandson Tommy's school play and seemed in good spirits overall.
        </p>
      </div>
    </div>
  );
}
