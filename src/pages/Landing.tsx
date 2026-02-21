import { Link } from "react-router-dom";
import { Phone, Brain, Users, Shield, Heart, Activity, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-semibold text-foreground">Memo</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#what-we-detect" className="hover:text-foreground transition-colors">What We Detect</a>
          <a href="#testimonials" className="hover:text-foreground transition-colors">Stories</a>
        </div>
        <Link to="/dashboard">
          <Button size="sm" variant="outline" className="rounded-full">
            Family Dashboard
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-24 md:pt-24 md:pb-32 max-w-5xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight tracking-tight"
        >
          Know your loved one is okay.
          <br />
          <span className="text-primary">Before they know something is wrong.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Memo calls your family member daily, listens carefully, and detects early signs of cognitive decline — passively, privately, and with their full consent.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/onboarding">
            <Button size="lg" className="rounded-full px-8 text-base gap-2">
              Add a Family Member <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base">
              See How It Works
            </Button>
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> No app required for your loved one</span>
          <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-primary" /> Full consent required</span>
          <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> Not a medical device</span>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 md:px-12 py-20 md:py-28 bg-memo-warm">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary uppercase tracking-wider mb-3">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Simple for them. Powerful for you.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Phone,
                title: "Memo calls daily",
                desc: "A warm AI companion calls at their chosen time, every day. It feels like a friendly check-in, not a medical exam.",
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
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                custom={i + 2}
                className="bg-card rounded-2xl border border-border p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-memo-sage-light flex items-center justify-center mb-5">
                  <card.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What We Detect */}
      <section id="what-we-detect" className="px-6 md:px-12 py-20 md:py-28 max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary uppercase tracking-wider mb-3">What We Detect</motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Early signals that matter
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <motion.div variants={fadeUp} custom={2} className="bg-card rounded-2xl border border-border p-8">
            <h3 className="text-lg font-display font-semibold text-foreground mb-5">Neurological Signals</h3>
            <ul className="space-y-3">
              {["Parkinson's early markers", "Post-stroke speech changes", "Vocal tremor detection", "Articulation changes"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div variants={fadeUp} custom={3} className="bg-card rounded-2xl border border-border p-8">
            <h3 className="text-lg font-display font-semibold text-foreground mb-5">Cognitive & Emotional Signals</h3>
            <ul className="space-y-3">
              {["Alzheimer's early patterns", "Word-finding difficulty", "Depression markers", "Anxiety indicators"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Memo is a screening awareness tool, not a diagnostic device.
        </motion.p>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="px-6 md:px-12 py-20 md:py-28 bg-memo-warm">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Stories</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Families who found peace of mind
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {[
              {
                quote: "I live three states away from my mother. Memo gives me the confidence that if something changes, I'll know right away. It's like having a caring neighbor who checks in every day.",
                name: "Laura",
                relation: "Daughter of Margaret, 78",
              },
              {
                quote: "Dad would never agree to a medical device. But Memo is just a friendly phone call. He loves it — and I love the peace of mind it gives our whole family.",
                name: "David",
                relation: "Son of Robert, 82",
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                custom={i + 2}
                className="bg-card rounded-2xl border border-border p-8 shadow-sm"
              >
                <p className="text-sm text-foreground leading-relaxed italic mb-6">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.relation}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 md:py-28 max-w-4xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Start protecting your loved one today
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Setup takes less than 5 minutes. No apps to install. No devices to buy.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Link to="/onboarding">
              <Button size="lg" className="rounded-full px-10 text-base gap-2">
                Add a Family Member <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-memo-warm px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">Memo</span>
            <span className="text-xs text-muted-foreground ml-2">Care that listens.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
