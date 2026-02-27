import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { LayoutDashboard, Activity, GitBranch, Compass, Settings, UserPlus } from "lucide-react";
import { useMemoDashboardData } from "@/hooks/useMemoDashboardData";

const navItems = [
  { title: "Overview",  url: "/dashboard",      icon: LayoutDashboard },
  { title: "Signals",   url: "/health-signals", icon: Activity },
  { title: "Graph",     url: "/patient-graph",  icon: GitBranch },
  { title: "Care",      url: "/care",           icon: Compass },
  { title: "Settings",  url: "/settings",       icon: Settings },
];

export function MemoSidebar() {
  const { patient } = useMemoDashboardData();

  return (
    <aside className="flex flex-col w-[196px] h-screen border-r border-border bg-white shrink-0">
      {/* Brand */}
      <Link to="/dashboard" className="flex items-center gap-2 h-[52px] px-4 border-b border-border">
        <span className="text-[14px] font-semibold tracking-tight text-foreground">memo</span>
        <span className="relative flex h-[5px] w-[5px] ml-0.5">
          <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-memo-green opacity-75" />
          <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-memo-green" />
        </span>
      </Link>

      {/* Patient context */}
      {patient && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] text-muted-foreground">Monitoring</p>
          <p className="text-[13px] font-medium text-foreground truncate mt-0.5">{patient.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 pt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-[#F5F5F5] transition-colors duration-100"
            activeClassName="bg-[#F0F0F0] text-foreground font-medium"
          >
            <item.icon className="w-[14px] h-[14px] shrink-0" strokeWidth={1.75} />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-border">
        <NavLink
          to="/onboarding"
          className="flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-[#F5F5F5] transition-colors"
          activeClassName="bg-[#F0F0F0] text-foreground"
        >
          <UserPlus className="w-[13px] h-[13px] shrink-0" strokeWidth={1.75} />
          <span>Add patient</span>
        </NavLink>
      </div>
    </aside>
  );
}
