import { MemoLayout } from "@/components/memo/MemoLayout";
import { StabilityGauge } from "@/components/memo/StabilityGauge";
import { MetricsChart } from "@/components/memo/MetricsChart";
import { TodaysCallCard } from "@/components/memo/TodaysCallCard";
import { AlertBanner } from "@/components/memo/AlertBanner";
import { MemoryFeed } from "@/components/memo/MemoryFeed";
import { User } from "lucide-react";

const Dashboard = () => {
  return (
    <MemoLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-memo-sage-light flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Margaret Wilson</h1>
              <p className="text-sm text-muted-foreground">Last call today at 10:30 AM · All systems normal</p>
            </div>
          </div>
          <StabilityGauge score={82} />
        </div>

        {/* Alert */}
        <AlertBanner show={true} />

        {/* Charts + Call */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MetricsChart />
          </div>
          <div className="lg:col-span-2">
            <TodaysCallCard />
          </div>
        </div>

        {/* Memory Bank */}
        <MemoryFeed />
      </div>
    </MemoLayout>
  );
};

export default Dashboard;
