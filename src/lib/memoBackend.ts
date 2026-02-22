import { convexClient } from "./convexClient";
import type { ConvexPatient, ConvexCall, ConvexMemory, ConvexAlert } from "./convexClient";

export type MemoFamilyContext = {
  patient: ConvexPatient;
  calls: ConvexCall[];
  memories: ConvexMemory[];
  alerts: ConvexAlert[];
};

const FAMILY_KEY = "memoFamilyUserId";
const LOCAL_PATIENT_KEY = "memoLocalPatient";

export const getDefaultFamilyId = () => {
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

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingCreate =
      message.includes("Could not find public function") && message.includes("patients:create");

    if (!missingCreate) {
      throw error;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        LOCAL_PATIENT_KEY,
        JSON.stringify({
          _id: "local-patient",
          name: args.name.trim() || "New Patient",
          phoneNumber: args.phone.trim(),
          familyUserId,
          memoTime: args.callTime,
          timezone: args.timezone || "America/Chicago",
          consentGiven: true,
          knownPeople,
          emergencyContact: firstFamilyPhone,
        })
      );
    }

    return "local-patient";
  }
}

export async function triggerCallNow(args: { phone: string; name?: string }) {
  let response: Response;
  try {
    response = await fetch("http://localhost:3001/call-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: args.phone.trim(),
        name: args.name?.trim() || "Patient",
      }),
    });
  } catch {
    throw new Error("Cannot reach local backend at http://localhost:3001/call-now.");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to trigger immediate call.");
  }

  return await response.json();
}

const fetchPatientsForFamily = async (familyUserId: string) => {
  try {
    return await convexClient.query("patients:listForFamily", { familyUserId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Could not find public function") && message.includes("patients:listForFamily")) {
      return [];
    }
    throw error;
  }
};

export async function fetchDashboardData() {
  const familyUserId = getDefaultFamilyId();
  const patients = await fetchPatientsForFamily(familyUserId);
  const patient = patients.length ? patients[0] : null;
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
