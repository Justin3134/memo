import { convexClient } from "./convexClient";
import type { ConvexPatient, ConvexCall, ConvexMemory, ConvexAlert } from "./convexClient";

export type MemoFamilyContext = {
  patient: ConvexPatient;
  calls: ConvexCall[];
  memories: ConvexMemory[];
  alerts: ConvexAlert[];
};

const FAMILY_KEY = "memoFamilyUserId";

const getDefaultFamilyId = () => {
  if (typeof window === "undefined") {
    return "family-default";
  }

  let existing = localStorage.getItem(FAMILY_KEY);
  if (!existing) {
    existing = `family-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(FAMILY_KEY, existing);
  }
  return existing;
};

export async function getActiveFamilyId() {
  return getDefaultFamilyId();
}

export async function upsertPatientFromOnboarding(args: {
  name: string;
  phone: string;
  callTime: string;
  timezone: string;
  familyMembers: { name: string; phone: string; relationship: string }[];
}) {
  const familyUserId = getDefaultFamilyId();

  const knownPeople = args.familyMembers
    .filter((member) => member.name.trim() && member.relationship.trim())
    .map((member) => ({ name: member.name.trim(), relationship: member.relationship.trim() }));

  const firstFamilyPhone = args.familyMembers.find((member) => member.phone.trim())?.phone.trim();

  const patientId = await convexClient.mutation("patients:create", {
    name: args.name.trim() || "New Patient",
    phoneNumber: args.phone.trim(),
    familyUserId,
    memoTime: args.callTime,
    timezone: args.timezone || "America/Chicago",
    consentGiven: true,
    knownPeople,
    emergencyContact: firstFamilyPhone,
  });

  return patientId;
}

export async function fetchDashboardData() {
  const familyUserId = getDefaultFamilyId();
  const patients = await convexClient.query("patients:listForFamily", { familyUserId });
  const patient = patients.length ? patients[0] : await getFirstPatientFallback();
  if (!patient) {
    return { patient: null, calls: [], memories: [], alerts: [] };
  }

  const [calls, memories, alerts] = await Promise.all([
    convexClient.query("calls:listForPatient", {
      patientId: patient._id,
      limit: 30,
    }),
    convexClient.query("memories:getRecent", {
      patientId: patient._id,
      limit: 20,
    }),
    convexClient.query("alerts:getRecentForPatient", {
      patientId: patient._id,
      limit: 20,
    }),
  ]);

  return {
    patient,
    calls: calls as ConvexCall[],
    memories: memories as ConvexMemory[],
    alerts: alerts as ConvexAlert[],
  };
}

async function getFirstPatientFallback() {
  const all = await convexClient.query("patients:getAll");
  return all?.[0] ?? null;
}
