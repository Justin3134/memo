import { MemoLayout } from "@/components/memo/MemoLayout";
import { Play, BookOpen, Clock } from "lucide-react";

const featuredVideo = {
  title: "Understanding Pause Frequency Changes",
  description: "Generated based on elevated pause frequency detected this week. This video explains what increased pauses during speech may indicate, including fatigue, medication effects, and early neurological signals.",
  duration: "3:42",
  date: "Feb 20, 2026",
  trigger: "Pause frequency 4.2/min vs 3.1 baseline",
};

const previousVideos = [
  { title: "Early Signs of Cognitive Decline", duration: "4:15", date: "Feb 14", trigger: "Cognitive score drop" },
  { title: "Speech Rate Changes and What They Mean", duration: "3:28", date: "Feb 10", trigger: "Speech rate variance" },
  { title: "Managing Fatigue in Elderly Patients", duration: "2:56", date: "Feb 5", trigger: "Repeated fatigue reports" },
  { title: "Word-Finding Difficulty Explained", duration: "3:10", date: "Jan 30", trigger: "Word-finding score decline" },
];

const staticGuides = [
  { title: "Understanding Cognitive Decline", subtitle: "A guide for families on recognizing and responding to early signs of cognitive change." },
  { title: "When to Talk to a Doctor About Speech Changes", subtitle: "Practical guidance on which speech patterns warrant medical consultation." },
  { title: "Supporting Daily Wellness", subtitle: "How to maintain and improve quality of life through daily routines and engagement." },
];

const CareGuide = () => {
  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-xs text-muted-foreground mb-1">Guidance</p>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-display text-foreground">Care Guide</h1>
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">powered by MiniMax</span>
        </div>
        <p className="text-[13px] text-muted-foreground mb-6">Personalized guidance based on Margaret's recent patterns</p>

        {/* Featured Video */}
        <div className="bg-card rounded-lg border border-border overflow-hidden mb-6">
          <div className="aspect-video bg-secondary flex items-center justify-center relative">
            <div className="w-14 h-14 rounded-full bg-foreground/80 flex items-center justify-center cursor-pointer hover:bg-foreground transition-colors">
              <Play className="w-6 h-6 text-background ml-0.5" />
            </div>
            <div className="absolute bottom-3 right-3 bg-foreground/70 text-background text-[11px] px-2 py-0.5 rounded font-medium">
              {featuredVideo.duration}
            </div>
          </div>
          <div className="p-5">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Latest Guidance</p>
            <h2 className="text-base font-display text-foreground mb-1.5">{featuredVideo.title}</h2>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{featuredVideo.description}</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {featuredVideo.date}</span>
              <span className="text-border">|</span>
              <span>Triggered by: {featuredVideo.trigger}</span>
            </div>
          </div>
        </div>

        {/* Previous Videos */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Previous Guidance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {previousVideos.map((video, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground mb-0.5">{video.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{video.date}</span>
                      <span className="text-border">|</span>
                      <span>{video.duration}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{video.trigger}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Static Guides */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">General Guides</p>
          <div className="space-y-2">
            {staticGuides.map((guide, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{guide.title}</p>
                  <p className="text-[11px] text-muted-foreground">{guide.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MemoLayout>
  );
};

export default CareGuide;
