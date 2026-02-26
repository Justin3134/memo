import { MemoSidebar } from "@/components/memo/MemoSidebar";

interface MemoLayoutProps {
  children: React.ReactNode;
}

export function MemoLayout({ children }: MemoLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-[#F8F8F8]">
      <MemoSidebar />
      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}
