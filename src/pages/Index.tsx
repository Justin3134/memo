import { MemoLayout } from "@/components/memo/MemoLayout";
import { StabilityGauge } from "@/components/memo/StabilityGauge";
import { MetricsChart } from "@/components/memo/MetricsChart";
import { TodaysCallCard } from "@/components/memo/TodaysCallCard";
import { AlertBanner } from "@/components/memo/AlertBanner";
import { MemoryFeed } from "@/components/memo/MemoryFeed";

const Dashboard = () => {
  return (
    <MemoLayout>
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Patient Overview</p>
            <h1 className="text-xl font-display text-foreground">Margaret Wilson</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Last call today, 10:30 AM. All signals within baseline.</p>
          </div>
          <StabilityGauge score={82} />
        </div>

        {/* Alert */}
        <AlertBanner show={true} />

        {/* Charts + Call */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <MetricsChart />
          </div>
          <div className="lg:col-span-2">
            <TodaysCallCard />
          </div>
        </div>

        {/* Recent */}
        <MemoryFeed />
      </div>
    </MemoLayout>
  );
};

export default Dashboard;
