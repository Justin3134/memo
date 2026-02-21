import { Link } from "react-router-dom";
import { Phone, Brain, Users, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import memoLogo from "@/assets/memo-logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src={memoLogo} alt="Memo" className="w-9 h-9 rounded-lg" />
          <span className="text-lg font-display font-semibold text-foreground tracking-tight">Memo</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#signals" className="hover:text-foreground transition-colors">What We Detect</a>
        </div>
        <Link to="/dashboard">
          <Button size="sm" variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
            Family Dashboard →
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-16 md:pt-28 md:pb-24 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-snug tracking-tight">
          Know your loved one is okay —
          <span className="text-primary"> before they know something is wrong.</span>
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
          Memo calls your family member daily, listens carefully, and detects early signs of cognitive decline — passively, privately, and with their full consent.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/onboarding">
            <Button size="lg" className="rounded-full px-7 text-sm gap-2">
              Add a Family Member <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="rounded-full px-7 text-sm">
              See How It Works
            </Button>
          </a>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>✦ No app required for your loved one</span>
          <span>✦ Full consent required</span>
          <span>✦ Not a medical device</span>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 md:px-12 py-16 md:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">How It Works</p>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-10">
            Simple for them. Powerful for you.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: "Memo calls daily",
                desc: "A warm AI companion calls at their chosen time. It feels like a friendly check-in, not a medical exam.",
              },
              {
                icon: Brain,
                title: "Voice patterns analyzed",
                desc: "Speech rate, pauses, and clarity are tracked over time. Subtle changes that humans miss become visible trends.",
              },
              {
                icon: Users,
                title: "Family stays informed",
                desc: "You get a real-time dashboard and alerts when something changes. No surprises — just peace of mind.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card rounded-2xl border border-border p-7"
              >
                <div className="w-10 h-10 rounded-xl bg-memo-sage-light flex items-center justify-center mb-4">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-display font-semibold text-foreground mb-1.5">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Detect */}
      <section id="signals" className="px-6 md:px-12 py-16 md:py-20 bg-memo-warm">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">What We Detect</p>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-10">
            Early signals that matter
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl border border-border p-7">
              <h3 className="text-base font-display font-semibold text-foreground mb-4">Neurological Signals</h3>
              <ul className="space-y-2.5">
                {["Parkinson's early markers", "Post-stroke speech changes", "Vocal tremor detection", "Articulation changes"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-2xl border border-border p-7">
              <h3 className="text-base font-display font-semibold text-foreground mb-4">Cognitive & Emotional Signals</h3>
              <ul className="space-y-2.5">
                {["Alzheimer's early patterns", "Word-finding difficulty", "Depression markers", "Anxiety indicators"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Memo is a screening awareness tool, not a diagnostic device.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 md:py-24 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
          Start protecting your loved one today
        </h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          Setup takes less than 5 minutes. No apps to install. No devices to buy.
        </p>
        <Link to="/onboarding">
          <Button size="lg" className="rounded-full px-8 text-sm gap-2">
            Add a Family Member <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={memoLogo} alt="Memo" className="w-7 h-7 rounded-md" />
            <span className="font-display font-semibold text-foreground text-sm">Memo</span>
            <span className="text-xs text-muted-foreground ml-1">Care that listens.</span>
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
