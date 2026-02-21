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
        <header className="flex items-center justify-end px-8 py-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">Monitoring</p>
              <p className="text-xs text-muted-foreground">Margaret Wilson</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-memo-sage-light flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
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
