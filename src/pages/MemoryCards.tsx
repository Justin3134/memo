import { MemoLayout } from "@/components/memo/MemoLayout";
import { Play, MessageSquare } from "lucide-react";

const transcript = [
  { speaker: "Memo", text: "Good morning Margaret. How are you feeling today?" },
  { speaker: "Margaret", text: "Good morning. I'm doing alright, a bit tired from gardening yesterday." },
  { speaker: "Memo", text: "What were you working on in the garden?" },
  { speaker: "Margaret", text: "I planted some new tulip bulbs along the front path. The soil was quite hard." },
  { speaker: "Memo", text: "Tulips will be nice in spring. Did you take breaks?" },
  { speaker: "Margaret", text: "I sat down after about twenty minutes. My back was reminding me I'm not as young as I used to be." },
  { speaker: "Memo", text: "That's sensible. How was your morning walk today?" },
  { speaker: "Margaret", text: "I went to the park. The birds are back. I counted seven sparrows near the bench." },
  { speaker: "Memo", text: "Tommy's school play is coming up next week, isn't it?" },
  { speaker: "Margaret", text: "Yes, he's playing a tree. He's very excited about it." },
];

const metrics = [
  { label: "Speech Rate", value: "128 wpm", baseline: "134 wpm", trend: "slightly lower", data: [65, 70, 68, 72, 70, 66, 63] },
  { label: "Pause Frequency", value: "4.2/min", baseline: "3.1/min", trend: "elevated", data: [30, 32, 31, 33, 35, 40, 42] },
  { label: "Pitch Variance", value: "18 Hz", baseline: "22 Hz", trend: "reduced", data: [50, 48, 45, 42, 40, 38, 36] },
];

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 28;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");

  return (
    <svg width={width} height={height} className="mt-1.5">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const MemoryCards = () => {
  return (
    <MemoLayout>
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <h1 className="text-2xl font-display text-foreground mb-0.5">Call Detail</h1>
        <p className="text-sm text-muted-foreground mb-6">February 20, 2026 at 10:30 AM</p>

        {/* Audio player placeholder */}
        <div className="w-full rounded-lg bg-secondary border border-border p-5 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
            <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
          </div>
          <div className="flex-1">
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-primary rounded-full" />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
              <span>4:12</span>
              <span>12:34</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Transcript */}
          <div className="lg:col-span-3 bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Transcript</h3>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto memo-scrollbar pr-2">
              {transcript.map((line, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${line.speaker === "Memo" ? "" : "flex-row-reverse text-right"}`}
                >
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    line.speaker === "Memo" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}>
                    {line.speaker[0]}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${line.speaker === "Memo" ? "" : "ml-auto"}`}>
                    <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{line.speaker}</p>
                    <p className={`text-sm leading-relaxed px-3.5 py-2 rounded-lg ${
                      line.speaker === "Memo"
                        ? "bg-secondary text-secondary-foreground rounded-tl-sm"
                        : "bg-memo-teal-light text-foreground rounded-tr-sm"
                    }`}>
                      {line.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acoustic Metrics */}
          <div className="space-y-3">
            {metrics.map((metric, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{metric.label}</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{metric.value}</p>
                <p className="text-[11px] text-muted-foreground">Baseline: {metric.baseline}</p>
                <Sparkline data={metric.data} color={metric.trend === "elevated" ? "hsl(38, 75%, 52%)" : "hsl(199, 55%, 36%)"} />
                <p className={`text-[11px] mt-1 font-medium ${
                  metric.trend === "elevated" ? "text-memo-amber" : "text-muted-foreground"
                }`}>
                  {metric.trend}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MemoLayout>
  );
};

export default MemoryCards;
