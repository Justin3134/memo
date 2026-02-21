import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Layers, AlertTriangle, Settings } from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Memory Cards", url: "/memory-cards", icon: Layers },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MemoSidebar() {
  const location = useLocation();
  const isLive = true;

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10 px-3">
        <span className="text-lg font-display text-foreground">Memo</span>
        {isLive && (
          <span className="ml-auto relative flex h-2.5 w-2.5">
            <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-memo-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-memo-green" />
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
          >
            <item.icon className="w-4 h-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border pt-3 mt-3">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
        >
          <Settings className="w-4 h-4" />
          <span>Setup</span>
        </NavLink>
      </div>
    </aside>
  );
}
