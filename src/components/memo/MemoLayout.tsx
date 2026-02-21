import { MemoSidebar } from "@/components/memo/MemoSidebar";

interface MemoLayoutProps {
  children: React.ReactNode;
}

export function MemoLayout({ children }: MemoLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <MemoSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
