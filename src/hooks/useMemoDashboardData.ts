import { useState, useEffect, useCallback, useRef } from "react";
import { getActivePatientId, setActivePatientId, clearActivePatientId } from "@/lib/memoBackend";

const API = (import.meta as any).env?.VITE_BACKEND_URL ?? "http://localhost:8000";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const useMemoDashboardData = () => {
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePatientId, setActivePatientIdState] = useState<string | null>(
    () => getActivePatientId()
  );
  const mountedRef = useRef(true);

  const loadPatients = useCallback(async () => {
    const patients = await fetchJson<any[]>(`${API}/api/patients`);
    if (!mountedRef.current) return;
    setAllPatients(patients ?? []);
    return patients ?? [];
  }, []);

  const loadPatientData = useCallback(async (pid: string) => {
    const [c, m, a] = await Promise.all([
      fetchJson<any[]>(`${API}/api/patients/${pid}/calls?limit=30`),
      fetchJson<any[]>(`${API}/api/patients/${pid}/memories?limit=20`),
      fetchJson<any[]>(`${API}/api/patients/${pid}/alerts?limit=20`),
    ]);
    if (!mountedRef.current) return;
    setCalls(c ?? []);
    setMemories(m ?? []);
    setAlerts(a ?? []);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const patients = await loadPatients();
      if (cancelled || !patients) { setLoading(false); return; }

      let pid = activePatientId;
      if (patients.length === 0) {
        clearActivePatientId();
        pid = null;
      } else if (!pid || !patients.find((p: any) => p._id === pid)) {
        pid = patients[0]._id;
        setActivePatientId(pid);
        setActivePatientIdState(pid);
      }

      if (pid) {
        await loadPatientData(pid);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; mountedRef.current = false; };
  }, [activePatientId]);

  // Auto-refresh every 5s so dashboard stays live after calls
  useEffect(() => {
    const interval = setInterval(() => {
      if (activePatientId) {
        loadPatientData(activePatientId);
        loadPatients();
      }
    }, 5_000);
    return () => clearInterval(interval);
  }, [activePatientId, loadPatientData, loadPatients]);

  const switchPatient = useCallback((id: string) => {
    setActivePatientId(id);
    setActivePatientIdState(id);
  }, []);

  const refresh = useCallback(async () => {
    const patients = await loadPatients();
    const pid = activePatientId || patients?.[0]?._id;
    if (pid) await loadPatientData(pid);
  }, [activePatientId, loadPatients, loadPatientData]);

  const patient =
    (activePatientId ? allPatients.find((p) => p._id === activePatientId) : null) ??
    allPatients[0] ??
    null;

  return {
    loading,
    error: null,
    patient,
    allPatients,
    switchPatient,
    calls,
    memories,
    alerts,
    refresh,
  };
};
