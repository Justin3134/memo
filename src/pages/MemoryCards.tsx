import { MemoLayout } from "@/components/memo/MemoLayout";
import { motion } from "framer-motion";
import { Play, MessageSquare } from "lucide-react";

const transcript = [
  { speaker: "Memo", text: "Good morning Margaret! How are you feeling today?" },
  { speaker: "Margaret", text: "Oh, good morning dear. I'm doing alright, a bit tired from gardening yesterday." },
  { speaker: "Memo", text: "Gardening sounds lovely! What were you working on?" },
  { speaker: "Margaret", text: "I planted some new tulip bulbs along the front path. The soil was quite hard though." },
  { speaker: "Memo", text: "Tulips will be beautiful in spring. Did you take any breaks while gardening?" },
  { speaker: "Margaret", text: "I sat down after about twenty minutes. My back was reminding me I'm not as young as I used to be." },
  { speaker: "Memo", text: "That's very sensible. How about your morning walk today?" },
  { speaker: "Margaret", text: "I went to the park. The birds are back — I counted seven sparrows near the bench." },
  { speaker: "Memo", text: "How wonderful! Tommy's school play is coming up next week, isn't it?" },
  { speaker: "Margaret", text: "Yes! He's playing a tree. He's very excited about it. Tommy reminded me of your father when he was young, always performing." },
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
  const height = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");

  return (
    <svg width={width} height={height} className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const MemoryCards = () => {
  return (
    <MemoLayout>
      <div className="max-w-6xl mx-auto animate-fade-in-up">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Memory Card</h1>
        <p className="text-sm text-muted-foreground mb-6">February 20, 2026 · Morning Call</p>

        {/* Video card placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full h-64 rounded-2xl bg-gradient-to-br from-memo-sage-light via-secondary to-memo-warm border border-border overflow-hidden mb-8 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-card/80 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-lg cursor-pointer hover:scale-105 transition-transform">
              <Play className="w-6 h-6 text-primary ml-1" />
            </div>
            <p className="text-sm font-medium text-foreground">Generated Video Summary</p>
            <p className="text-xs text-muted-foreground mt-1">Margaret's morning — gardening, birds, and Tommy</p>
          </div>
          {/* decorative shapes */}
          <div className="absolute top-8 right-12 w-20 h-20 rounded-full bg-primary/5" />
          <div className="absolute bottom-6 left-10 w-14 h-14 rounded-full bg-accent/10" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Transcript */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-display font-semibold text-foreground">Full Transcript</h3>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto memo-scrollbar pr-2">
              {transcript.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: line.speaker === "Memo" ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex gap-3 ${line.speaker === "Memo" ? "" : "flex-row-reverse text-right"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    line.speaker === "Memo" ? "bg-primary text-primary-foreground" : "bg-memo-sage-light text-primary"
                  }`}>
                    {line.speaker[0]}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${line.speaker === "Memo" ? "" : "ml-auto"}`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{line.speaker}</p>
                    <p className={`text-sm leading-relaxed px-4 py-2.5 rounded-2xl ${
                      line.speaker === "Memo"
                        ? "bg-secondary text-secondary-foreground rounded-tl-sm"
                        : "bg-memo-sage-light text-foreground rounded-tr-sm"
                    }`}>
                      {line.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Acoustic Metrics Sidebar */}
          <div className="space-y-4">
            {metrics.map((metric, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{metric.value}</p>
                <p className="text-xs text-muted-foreground">Baseline: {metric.baseline}</p>
                <Sparkline data={metric.data} color={metric.trend === "elevated" ? "hsl(38, 80%, 55%)" : "hsl(152, 32%, 42%)"} />
                <p className={`text-xs mt-1 font-medium ${
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
