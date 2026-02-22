import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDefaultFamilyId } from "@/lib/memoBackend";

export const useMemoDashboardData = () => {
  const familyUserId = getDefaultFamilyId();

  const patients = useQuery(api.patients.listForFamily, { familyUserId });
  const allPatients = useQuery(api.patients.getAll);

  const patient = patients?.[0] ?? allPatients?.[0] ?? null;
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
    calls: calls ?? [],
    memories: memories ?? [],
    alerts: alerts ?? [],
  };
};
