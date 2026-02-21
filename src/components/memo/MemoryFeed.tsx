const memories = [
  { date: "Feb 20", summary: "Discussed morning walk and gardening. Mentioned grandson Tommy's school play.", tag: "Family", tagColor: "bg-memo-teal-light text-primary" },
  { date: "Feb 19", summary: "Reported improved blood pressure at recent checkup. Positive mood throughout.", tag: "Health", tagColor: "bg-memo-amber-light text-memo-amber" },
  { date: "Feb 18", summary: "Talked about baking a lemon cake. Engaged and detailed recall of the recipe.", tag: "Daily Life", tagColor: "bg-secondary text-secondary-foreground" },
  { date: "Feb 17", summary: "Observed birds returning to garden. Counted seven sparrows. Clear articulation.", tag: "Daily Life", tagColor: "bg-secondary text-secondary-foreground" },
  { date: "Feb 16", summary: "Recalled a family trip to the coast. Strong long-term memory engagement.", tag: "Family", tagColor: "bg-memo-teal-light text-primary" },
  { date: "Feb 15", summary: "Mentioned neighbor Helen visiting with soup. Normal social interaction patterns.", tag: "Daily Life", tagColor: "bg-secondary text-secondary-foreground" },
];

export function MemoryFeed() {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1">Recent Calls</h3>
      <p className="text-xs text-muted-foreground mb-5">Summaries from the past week</p>
      <div className="space-y-3 max-h-[360px] overflow-y-auto memo-scrollbar pr-2">
        {memories.map((memory, i) => (
          <div
            key={i}
            className="border border-border rounded-md p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">{memory.date}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${memory.tagColor}`}>
                {memory.tag}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{memory.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
