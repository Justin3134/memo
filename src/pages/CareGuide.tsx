import { MemoLayout } from "@/components/memo/MemoLayout";
import { useState } from "react";
import { Play, AlertTriangle, BookOpen, Sparkles, Clock, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const staticGuides = [
  { title: "Understanding Cognitive Decline", subtitle: "A guide for families on recognizing and responding to early signs of cognitive change." },
  { title: "When to Talk to a Doctor About Speech Changes", subtitle: "Practical guidance on which speech patterns warrant medical consultation." },
  { title: "Supporting Daily Wellness", subtitle: "How to maintain and improve quality of life through daily routines and engagement." },
];

const CareGuide = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const { loading, error, patient, calls, alerts } = useMemoDashboardData();

  const videos = useQuery(
    api.healthVideos.listForPatient,
    patient?._id ? { patientId: patient._id as any, limit: 20 } : "skip"
  );

  const latestAlert = alerts[0] ?? null;
  const latestGuidanceTopic = calls.find((c) => c.videoGuidanceTopic)?.videoGuidanceTopic;
  const featuredVideo = videos?.[0] ?? null;
  const previousVideos = videos?.slice(1) ?? [];

  if (loading) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-muted-foreground">Loading care guidance...</p>
        </div>
      </MemoLayout>
    );
  }

  if (error) {
    return (
      <MemoLayout>
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <p className="text-sm text-memo-red">Unable to load care guide: {error}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-foreground hover:underline">
            Return to dashboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </MemoLayout>
    );
  }

  return (
    <MemoLayout>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Guidance</p>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-xl font-display text-foreground tracking-tight">Care Guide</h1>
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">powered by MiniMax Hailuo</span>
        </div>
        <p className="text-[13px] text-muted-foreground mb-6">
          {patient ? `Personalized guidance for ${patient.name}` : "Personalized guidance based on recent call patterns"}
        </p>

        {/* Latest Alert Signal */}
        {latestAlert && (
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-memo-amber" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Latest Signal</p>
              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                latestAlert.severity === "high" ? "bg-memo-red/10 text-memo-red" :
                latestAlert.severity === "medium" ? "bg-memo-amber/10 text-memo-amber" :
                "bg-memo-green/10 text-memo-green"
              }`}>{latestAlert.severity}</span>
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">{latestAlert.signalType}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{latestAlert.description}</p>
            {latestAlert.recommendedAction && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Recommended:</span> {latestAlert.recommendedAction}
              </p>
            )}
          </div>
        )}

        {/* Featured Generated Video */}
        {featuredVideo ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden mb-6">
            {activeVideo === featuredVideo._id ? (
              <video
                src={featuredVideo.videoUrl}
                controls
                autoPlay
                className="w-full aspect-video bg-black"
                onEnded={() => setActiveVideo(null)}
              />
            ) : (
              <div
                className="aspect-video bg-secondary flex items-center justify-center relative cursor-pointer group"
                onClick={() => setActiveVideo(featuredVideo._id)}
              >
                <div className="w-14 h-14 rounded-full bg-foreground/80 flex items-center justify-center group-hover:bg-foreground transition-colors">
                  <Play className="w-6 h-6 text-background ml-0.5" />
                </div>
                <div className="absolute top-3 left-3 bg-foreground/70 text-background text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Generated
                </div>
              </div>
            )}
            <div className="p-5">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Latest Guidance Video</p>
              <h2 className="text-base font-display text-foreground mb-1.5">{featuredVideo.topic}</h2>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
                Generated by MiniMax Hailuo based on signals detected in {patient?.name ?? "your patient"}'s recent call.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(featuredVideo.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden mb-6">
            <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-[12px] text-muted-foreground text-center max-w-xs leading-relaxed">
                {latestGuidanceTopic
                  ? `Video generating for: "${latestGuidanceTopic}"`
                  : "MiniMax Hailuo will generate a personalized health education video when an anomaly is detected in a call."}
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Latest Guidance Video</p>
              <h2 className="text-base font-display text-foreground mb-1">No video yet</h2>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Videos are generated automatically when MiniMax M2 detects an anomaly during a call.
              </p>
            </div>
          </div>
        )}

        {/* Previous Generated Videos */}
        {previousVideos.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Previous Guidance Videos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previousVideos.map((video) => (
                <div
                  key={video._id}
                  className="bg-card rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-colors cursor-pointer"
                  onClick={() => setActiveVideo(activeVideo === video._id ? null : video._id)}
                >
                  {activeVideo === video._id ? (
                    <video src={video.videoUrl} controls autoPlay className="w-full aspect-video bg-black" />
                  ) : (
                    <div className="aspect-video bg-secondary flex items-center justify-center relative group">
                      <div className="w-10 h-10 rounded-full bg-foreground/70 flex items-center justify-center group-hover:bg-foreground transition-colors">
                        <Play className="w-4 h-4 text-background ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[13px] font-medium text-foreground mb-0.5 line-clamp-1">{video.topic}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(video.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Baseline</p>
            </div>
            <p className="text-[12px] text-foreground">
              Cognitive: {patient?.baseline?.cognitiveScore ? Math.round(patient.baseline.cognitiveScore) : "—"}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Videos Generated</p>
            </div>
            <p className="text-[12px] text-foreground">{videos?.length ?? 0} total</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active Alerts</p>
            </div>
            <p className="text-[12px] text-foreground">{alerts.length} signals</p>
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
