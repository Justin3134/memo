import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Activity, GitBranch, Compass, Settings } from "lucide-react";

const navItems = [
  { title: "Overview",  url: "/dashboard",       icon: LayoutDashboard },
  { title: "Signals",   url: "/health-signals",  icon: Activity },
  { title: "Graph",     url: "/patient-graph",   icon: GitBranch },
  { title: "Care",      url: "/care",            icon: Compass },
  { title: "Settings",  url: "/settings",        icon: Settings },
];

export function MemoSidebar() {
  return (
    <aside className="flex flex-col w-[200px] min-h-screen border-r border-border bg-[hsl(var(--sidebar-background))]">
      {/* Logo */}
      <div className="flex items-center gap-2 h-14 px-5 border-b border-border">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">memo</span>
        <span className="relative flex h-[6px] w-[6px] ml-0.5">
          <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-memo-green opacity-70" />
          <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-memo-green" />
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-100"
            activeClassName="bg-accent text-foreground font-medium"
          >
            <item.icon className="w-[15px] h-[15px] shrink-0" strokeWidth={1.75} />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Patient quick info */}
      <div className="p-3 border-t border-border">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          activeClassName="bg-accent text-foreground"
        >
          <span className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
            <span className="text-[9px] text-foreground/60">+</span>
          </span>
          <span>Add Patient</span>
        </NavLink>
      </div>
    </aside>
  );
}
