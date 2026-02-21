import { MemoSidebar } from "@/components/memo/MemoSidebar";
import { User } from "lucide-react";

interface MemoLayoutProps {
  children: React.ReactNode;
}

export function MemoLayout({ children }: MemoLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <MemoSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="flex items-center justify-end px-8 py-3.5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium text-foreground">Margaret Wilson</p>
              <p className="text-[11px] text-muted-foreground">Active patient</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
