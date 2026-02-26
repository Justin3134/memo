import { MemoSidebar } from "@/components/memo/MemoSidebar";

interface MemoLayoutProps {
  children: React.ReactNode;
}

export function MemoLayout({ children }: MemoLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F8F8]">
      <MemoSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
