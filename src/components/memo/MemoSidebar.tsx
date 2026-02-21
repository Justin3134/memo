import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { LayoutDashboard, Layers, AlertTriangle, Settings, Phone } from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Memory Cards", url: "/memory-cards", icon: Layers },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MemoSidebar() {
  const location = useLocation();
  const isLive = true; // placeholder

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-display font-semibold text-foreground">Memo</span>
        {isLive && (
          <span className="ml-auto relative flex h-3 w-3">
            <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-memo-sage opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-memo-sage" />
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border pt-4 mt-4">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
        >
          <Settings className="w-5 h-5" />
          <span>Setup</span>
        </NavLink>
      </div>
    </aside>
  );
}
