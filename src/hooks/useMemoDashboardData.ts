import { useQuery } from "convex/react";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { getDefaultFamilyId, getActivePatientId, setActivePatientId } from "@/lib/memoBackend";

export const useMemoDashboardData = () => {
  const familyUserId = getDefaultFamilyId();

  const patients = useQuery(api.patients.listForFamily, { familyUserId });
  const allPatients = useQuery(api.patients.getAll);

  const [activePatientId, setActivePatientIdState] = useState<string | null>(
    () => getActivePatientId()
  );

  // When patients load and there's no saved active patient, save the first one
  useEffect(() => {
    if (!activePatientId) {
      const first = patients?.[0] ?? allPatients?.[0];
      if (first) {
        setActivePatientId(first._id);
        setActivePatientIdState(first._id);
      }
    }
  }, [patients, allPatients, activePatientId]);

  const switchPatient = useCallback((id: string) => {
    setActivePatientId(id);
    setActivePatientIdState(id);
  }, []);

  const combinedPatients = (() => {
    const seen = new Set<string>();
    const result = [];
    for (const p of [...(patients ?? []), ...(allPatients ?? [])]) {
      if (!seen.has(p._id)) { seen.add(p._id); result.push(p); }
    }
    return result;
  })();

  const patient =
    combinedPatients.find((p) => p._id === activePatientId) ??
    combinedPatients[0] ??
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

  const loading =
    patients === undefined ||
    (patientId !== undefined && (calls === undefined || memories === undefined || alerts === undefined));

  return {
    loading,
    error: null,
    patient: patient ?? null,
    allPatients: combinedPatients,
    switchPatient,
    calls: calls ?? [],
    memories: memories ?? [],
    alerts: alerts ?? [],
  };
};
