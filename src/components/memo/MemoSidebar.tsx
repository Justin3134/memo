import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Activity, BookOpen, MapPin, Settings, UserPlus } from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Health Signals", url: "/health-signals", icon: Activity },
  { title: "Care Guide", url: "/care-guide", icon: BookOpen },
  { title: "Find Care", url: "/find-care", icon: MapPin },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MemoSidebar() {
  const isLive = true;

  return (
    <aside className="flex flex-col w-52 min-h-screen bg-sidebar border-r border-sidebar-border px-3 py-5">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-base font-display text-foreground tracking-tight">memo</span>
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-memo-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-memo-green" />
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-px flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
          >
            <item.icon className="w-[15px] h-[15px]" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border pt-2 mt-2">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
        >
          <UserPlus className="w-[15px] h-[15px]" />
          <span>Add Patient</span>
        </NavLink>
      </div>
    </aside>
  );
}
