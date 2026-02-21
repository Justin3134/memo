import { useCallback, useEffect, useState } from "react";
import type { ConvexPatient, ConvexCall, ConvexMemory, ConvexAlert } from "@/lib/convexClient";
import { fetchDashboardData } from "@/lib/memoBackend";

type DashboardState = {
  loading: boolean;
  error: string | null;
  patient: ConvexPatient | null;
  calls: ConvexCall[];
  memories: ConvexMemory[];
  alerts: ConvexAlert[];
};

const initialState: DashboardState = {
  loading: true,
  error: null,
  patient: null,
  calls: [],
  memories: [],
  alerts: [],
};

const isMissingPublicFunctionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Could not find public function");
};

export const useMemoDashboardData = () => {
  const [state, setState] = useState<DashboardState>(initialState);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        ...data,
      }));
    } catch (error) {
      if (isMissingPublicFunctionError(error)) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          patient: null,
          calls: [],
          memories: [],
          alerts: [],
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Could not load dashboard data.",
      }));
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20_000);
    return () => clearInterval(interval);
  }, [loadData]);

  return { ...state, refresh: loadData };
};
