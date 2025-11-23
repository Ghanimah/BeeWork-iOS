// src/contexts/AppContext.tsx
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode, type FC } from "react";
import { User, Shift, Availability, Page } from "../types";
import {
  collection, onSnapshot, doc,
  getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, increment,
  QueryDocumentSnapshot, DocumentData
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

type PunchState = "idle" | "punched_in" | "completed";
export interface ShiftPunchStatus {
  state: PunchState;
  activePunchId?: string | null;
  punchInAt?: string | null;
  punchOutAt?: string | null;
}

interface AppContextType {
  user: User;
  shifts: Shift[];
  availability: Availability[];
  currentPage: Page;
  selectedShift: Shift | null;
  language: "en" | "ar";
  setUser: (user: User) => void;
  setShifts: (shifts: Shift[]) => void;
  setAvailability: (availability: Availability[]) => void;
  setCurrentPage: (page: Page) => void;
  setSelectedShift: (shift: Shift | null) => void;
  setLanguage: (language: "en" | "ar") => void;
  punchIn: (shiftId: string) => Promise<void>;
  punchOut: (shiftId: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  logout: () => void;
  punchStatus: ShiftPunchStatus;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used within an AppProvider");
  return c;
};

function tsToDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v === "string") return new Date(v);
  return null;
}
const toISO = (d: Date | null) => (d ? d.toISOString() : undefined);
const ymd = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;

function parseCompositeShiftId(virtualId: string) {
  const p = virtualId.split("_");
  return { shiftDocId: p[0], userIdInId: p[1] };
}

// Helpers to simplify snapshot parsing and cut cognitive complexity
function toIsoMaybe(v: any): string | null {
  if (!v) return null;
  // Firestore Timestamp has toDate(); otherwise treat as string
  return v.toDate ? v.toDate().toISOString() : String(v);
}

function computePunchStatus(data: any, docId: string): ShiftPunchStatus {
  const hasIn = Boolean(data?.punchInAt);
  const hasOut = Boolean(data?.punchOutAt);
  let state: PunchState;
  if (hasOut) {
    state = "completed";
  } else if (hasIn) {
    state = "punched_in";
  } else {
    state = "idle";
  }
  return {
    state,
    activePunchId: docId,
    punchInAt: toIsoMaybe(data?.punchInAt),
    punchOutAt: toIsoMaybe(data?.punchOutAt),
  };
}

// Map a Firestore shift document to one or more Shift rows
function mapShiftDoc(d: QueryDocumentSnapshot<DocumentData>): Shift[] {
  const v: any = d.data();
  if ("eventName" in v || "companyName" in v) {
    return mapEventStyleShift(d, v);
  }
  if ("userId" in v) {
    return [mapSimpleShift(d, v)];
  }
  return [];
}

function mapEventStyleShift(d: QueryDocumentSnapshot<DocumentData>, v: any): Shift[] {
  const start = tsToDate(v.startTS);
  const end = tsToDate(v.endTS);
  const lat = v.location?.lat;
  const lng = v.location?.lng;
  const title = v.jobTitle ? `${v.companyName} - ${v.jobTitle}` : v.companyName;
  const dateStr = ymd(start) || "";
  const assigned: string[] = Array.isArray(v.assigned) ? v.assigned : [];
  return assigned.map((uid, i) => ({
    id: `${d.id}_${uid}_${i}`,
    userId: uid,
    title,
    location: v.locationName || "Location pending",
    date: dateStr,
    startTime: toISO(start),
    endTime: toISO(end),
    hourlyWage: Number(v.rateJOD ?? 0),
    latitude: Number(lat ?? 0),
    longitude: Number(lng ?? 0),
    status: (v.status as Shift["status"]) || "scheduled",
  }));
}

function mapSimpleShift(d: QueryDocumentSnapshot<DocumentData>, v: any): Shift {
  return {
    id: d.id,
    userId: v.userId,
    title: v.title,
    location: v.location ?? "Location pending",
    date: v.date ?? "",
    startTime: typeof v.startTime === "string" ? v.startTime : toISO(tsToDate(v.startTime)),
    endTime: typeof v.endTime === "string" ? v.endTime : toISO(tsToDate(v.endTime)),
    hourlyWage: Number(v.hourlyWage ?? 0),
    latitude: Number(v.latitude ?? 0),
    longitude: Number(v.longitude ?? 0),
    status: (v.status as Shift["status"]) || "scheduled",
  };
}

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    id: "", firstName: "", lastName: "", email: "", rating: 0, totalHours: 0,
    language: "en", role: "employee", profilePicture: ""
  });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [punchStatus, setPunchStatus] = useState<ShiftPunchStatus>({ state: "idle" });

  // Keep AppContext user in sync with Firebase Auth and Firestore profile.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser({ id: "", firstName: "", lastName: "", email: "", rating: 0, totalHours: 0, language: "en", role: "employee", profilePicture: "" });
        return;
      }
      const uid = firebaseUser.uid;
      const email = firebaseUser.email || "";
      try {
        const uref = doc(db, "users", uid);
        const snap = await getDoc(uref);
        if (snap.exists()) {
          const d: any = snap.data();
          setUser({
            id: uid,
            email,
            firstName: d.firstName || "",
            lastName: d.lastName || "",
            rating: Number(d.rating ?? 0),
            totalHours: Number(d.totalHours ?? 0),
            language: (d.language as User["language"]) || "en",
            role: (d.role as User["role"]) || "employee",
            profilePicture: d.profilePicture || "",
          });
        } else {
          // Profile doc missing - still set minimal user so routing works; create skeleton doc lazily.
          setUser({ id: uid, email, firstName: "", lastName: "", rating: 0, totalHours: 0, language: "en", role: "employee", profilePicture: "" });
          try { await setDoc(uref, { email }, { merge: true }); } catch {}
        }
      } catch {
        // On failure, at least set minimal user from Auth so app can proceed.
        setUser({ id: uid, email, firstName: "", lastName: "", rating: 0, totalHours: 0, language: "en", role: "employee", profilePicture: "" });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Only listen after auth to avoid permission-denied errors when unauthenticated.
    if (!user.id) { setShifts([]); return; }
    const unsub = onSnapshot(collection(db, "shifts"), (snap) => {
      const rows = snap.docs.flatMap(mapShiftDoc);
      rows.sort((a, b) => (new Date(b.startTime || 0).getTime()) - (new Date(a.startTime || 0).getTime()));
      setShifts(rows);
    });
    return () => unsub();
  }, [user.id]);

  useEffect(() => {
    setPunchStatus({ state: "idle" });
    if (!user.id || !selectedShift?.id) return;
    const { shiftDocId, userIdInId } = parseCompositeShiftId(selectedShift.id);
    const punchUserId = userIdInId || user.id;
    const ref = doc(db, "shifts", shiftDocId, "punches", punchUserId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setPunchStatus({ state: "idle" }); return; }
      setPunchStatus(computePunchStatus(snap.data(), snap.id));
    });
    return () => unsub();
  }, [user.id, selectedShift?.id]);

  const punchIn = async (shiftIdVirtual: string) => {
    if (!user.id) { alert("Not signed in."); return; }
    const { shiftDocId, userIdInId } = parseCompositeShiftId(shiftIdVirtual);
    const punchUserId = userIdInId || user.id;
    const punchRef = doc(db, "shifts", shiftDocId, "punches", punchUserId);
    const ex = (await getDoc(punchRef)).data() as any || {};
    if (ex?.punchInAt && !ex?.punchOutAt) { alert("Already punched in."); return; }
    await setDoc(punchRef, { punchInAt: serverTimestamp(), source: "app", userId: punchUserId }, { merge: true });
  };

  const punchOut = async (shiftIdVirtual: string) => {
    if (!user.id) { alert("Not signed in."); return; }
    const { shiftDocId, userIdInId } = parseCompositeShiftId(shiftIdVirtual);
    const punchUserId = userIdInId || user.id;
    const punchRef = doc(db, "shifts", shiftDocId, "punches", punchUserId);
    const snap = await getDoc(punchRef);
    if (!snap.exists()) { alert("No punch-in record found."); return; }
    const data = snap.data() as { punchInAt?: Timestamp; punchOutAt?: Timestamp };
    if (!data.punchInAt) { alert("No punch-in time found."); return; }
    if (data.punchOutAt) { alert("Already punched out."); return; }
    await updateDoc(punchRef, { punchOutAt: serverTimestamp() });
    const userRef = doc(db, "users", user.id);
    await updateDoc(userRef, { totalHours: increment(0) }); // keep your logic unchanged
  };

  const updateProfile = (u: Partial<User>) => setUser(prev => ({ ...prev, ...u }));
  const logout = () => { setUser({ ...user, id: "" }); setCurrentPage("home"); };

  const contextValue = useMemo(() => ({
    user, shifts, availability, currentPage, selectedShift, language,
    setUser, setShifts, setAvailability, setCurrentPage, setSelectedShift,
    setLanguage, punchIn, punchOut, updateProfile, logout,
    punchStatus,
  }), [user, shifts, availability, currentPage, selectedShift, language, punchStatus]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
