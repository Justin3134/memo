import { Link } from "react-router-dom";
import { Phone, BarChart3, Users, ChevronRight, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto">
        <span className="text-lg font-display text-foreground">Memo</span>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">Platform</a>
          <a href="#signals" className="hover:text-foreground transition-colors">Detection</a>
        </div>
        <Link to="/dashboard">
          <Button size="sm" variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-16 md:pt-28 md:pb-24 max-w-3xl mx-auto">
        <p className="text-xs font-medium text-primary uppercase tracking-widest mb-4">Voice-Based Cognitive Monitoring</p>
        <h1 className="text-3xl md:text-5xl font-display text-foreground leading-snug">
          Detect cognitive decline early through daily voice analysis.
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
          Memo places a brief daily phone call to your family member. Our platform analyzes speech patterns, flags changes in cognition and motor function, and delivers structured reports to family caregivers.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/onboarding">
            <Button size="lg" className="rounded-lg px-7 text-sm gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="rounded-lg px-7 text-sm">
              How It Works
            </Button>
          </a>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>No app required for the patient</span>
          <span className="text-border">·</span>
          <span>Consent-first protocol</span>
          <span className="text-border">·</span>
          <span>Not a diagnostic device</span>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 md:px-12 py-16 md:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Platform</p>
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-10">
            How Memo works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: "Daily voice call",
                desc: "Memo places a short, conversational call at a scheduled time. No devices or apps needed on their end.",
              },
              {
                icon: BarChart3,
                title: "Acoustic analysis",
                desc: "Speech rate, pause frequency, articulation clarity, and prosody are measured against a rolling baseline.",
              },
              {
                icon: Users,
                title: "Caregiver reporting",
                desc: "Structured health signals and call summaries are delivered to your dashboard in real time.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card rounded-lg border border-border p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <card.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Detect */}
      <section id="signals" className="px-6 md:px-12 py-16 md:py-20 bg-secondary/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Detection</p>
          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-10">
            What Memo monitors
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Neurological Signals</h3>
              </div>
              <ul className="space-y-2.5">
                {["Parkinson's early motor markers", "Post-stroke speech degradation", "Vocal tremor frequency analysis", "Articulation clarity scoring"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Cognitive & Emotional</h3>
              </div>
              <ul className="space-y-2.5">
                {["Alzheimer's pattern recognition", "Word-finding difficulty scoring", "Depression and withdrawal markers", "Anxiety and agitation indicators"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Memo is a screening and awareness tool. It is not a medical diagnostic device.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 md:py-24 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-display text-foreground mb-3">
          Start monitoring in under five minutes
        </h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          No hardware. No app installation. Just a phone number and consent.
        </p>
        <Link to="/onboarding">
          <Button size="lg" className="rounded-lg px-8 text-sm gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-foreground text-sm">Memo</span>
            <span className="text-xs text-muted-foreground">Cognitive voice monitoring for families.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
