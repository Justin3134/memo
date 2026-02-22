import { useQuery } from "convex/react";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { getActivePatientId, setActivePatientId } from "@/lib/memoBackend";

export const useMemoDashboardData = () => {
  // Always load all patients — the dataset is tiny and this is the most reliable
  const allPatients = useQuery(api.patients.getAll);

  const [activePatientId, setActivePatientIdState] = useState<string | null>(
    () => getActivePatientId()
  );

  // Auto-select the first patient when none is saved
  useEffect(() => {
    if (!activePatientId && allPatients && allPatients.length > 0) {
      const first = allPatients[0];
      setActivePatientId(first._id);
      setActivePatientIdState(first._id);
    }
  }, [allPatients, activePatientId]);

  const switchPatient = useCallback((id: string) => {
    setActivePatientId(id);
    setActivePatientIdState(id);
  }, []);

  // Find the active patient — prefer the saved ID, fall back to first
  const patient =
    (activePatientId ? allPatients?.find((p) => p._id === activePatientId) : null) ??
    allPatients?.[0] ??
    null;

  const patientId = patient?._id;

  const calls = useQuery(
    api.calls.listForPatient,
    patientId ? { patientId, limit: 30 } : "skip"
  );

  const memories = useQuery(
    api.memories.getRecent,
    patientId ? { patientId, limit: 20 } : "skip"
  );

  const alerts = useQuery(
    api.alerts.getRecentForPatient,
    patientId ? { patientId, limit: 20 } : "skip"
  );

  // Loading: waiting for patient list, or waiting for patient data once we have a patientId
  const loading =
    allPatients === undefined ||
    (patientId !== undefined &&
      (calls === undefined || memories === undefined || alerts === undefined));

  return {
    loading,
    error: null,
    patient: patient ?? null,
    allPatients: allPatients ?? [],
    switchPatient,
    calls: calls ?? [],
    memories: memories ?? [],
    alerts: alerts ?? [],
  };
};
