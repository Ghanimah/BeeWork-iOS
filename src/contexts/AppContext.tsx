import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { User, Shift, Availability, Page } from '../types';
import {
  collection,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

interface AppContextType {
  user: User;
  shifts: Shift[];
  availability: Availability[];
  currentPage: Page;
  selectedShift: Shift | null;
  language: 'en' | 'ar';
  setUser: (user: User) => void;
  setShifts: (shifts: Shift[]) => void;
  setAvailability: (availability: Availability[]) => void;
  setCurrentPage: (page: Page) => void;
  setSelectedShift: (shift: Shift | null) => void;
  setLanguage: (language: 'en' | 'ar') => void;
  punchIn: (shiftId: string) => Promise<void>;
  punchOut: (shiftId: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};

interface AppProviderProps { children: ReactNode; }

const defaultUser: User = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  rating: 0,
  totalHours: 0,
  language: 'en',
  role: 'employee',
  profilePicture: '',
};

// ----------------- helpers -----------------
function tsToDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'string' || v instanceof String) return new Date(v as string);
  return null;
}
function toISO(d: Date | null): string | undefined {
  return d ? d.toISOString() : undefined;
}
function ymd(d: Date | null): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function mapStatus(s: any): Shift['status'] {
  // portal: upcoming|live|done  app: scheduled|in-progress|completed
  if (s === 'live') return 'in-progress';
  if (s === 'done') return 'completed';
  if (s === 'upcoming') return 'scheduled';
  if (s === 'scheduled' || s === 'in-progress' || s === 'completed') return s;
  return 'scheduled';
}

/** portal-expanded id looks like "<shiftDocId>_<userId>_<n>" */
function parseCompositeShiftId(virtualId: string): { shiftDocId: string; userIdInId?: string } {
  const parts = virtualId.split('_');
  if (parts.length >= 2) {
    return { shiftDocId: parts[0], userIdInId: parts[1] };
  }
  return { shiftDocId: virtualId };
}

function expandPortalShift(docSnap: QueryDocumentSnapshot<DocumentData>): Shift[] {
  const d = docSnap.data() as any;
  if (!('eventName' in d) || !('startTS' in d) || !Array.isArray(d.assigned)) return [];
  const start = tsToDate(d.startTS);
  const end = tsToDate(d.endTS);
  const lat = d.location?.lat;
  const lng = d.location?.lng;
  const title = d.jobTitle ? `${d.eventName} – ${d.jobTitle}` : d.eventName;
  const dateStr = ymd(start);
  const startISO = toISO(start);
  const endISO = toISO(end);
  const hourly = typeof d.rateJOD === 'number' ? d.rateJOD : Number(d.rateJOD ?? 0);
  const locationLabel =
    typeof lat === 'number' && typeof lng === 'number'
      ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      : d.location || '—';

  return d.assigned
    .filter((uid: any) => typeof uid === 'string' && uid.length > 0)
    .map((uid: string, idx: number): Shift => ({
      id: `${docSnap.id}_${uid}_${idx}`, // virtual per-user id
      userId: uid,
      title,
      location: locationLabel,
      date: dateStr ?? '',
      startTime: startISO,
      endTime: endISO,
      hourlyWage: hourly,
      latitude: typeof lat === 'number' ? lat : 0,
      longitude: typeof lng === 'number' ? lng : 0,
      status: mapStatus(d.status),
    }));
}

function mapAppShift(docSnap: QueryDocumentSnapshot<DocumentData>): Shift | null {
  const d = docSnap.data() as any;
  if (!('title' in d) || !('userId' in d)) return null;
  return {
    id: docSnap.id,
    userId: d.userId,
    title: d.title,
    location: d.location ?? '—',
    date: d.date ?? '',
    startTime: typeof d.startTime === 'string' ? d.startTime : toISO(tsToDate(d.startTime)),
    endTime: typeof d.endTime === 'string' ? d.endTime : toISO(tsToDate(d.endTime)),
    hourlyWage: typeof d.hourlyWage === 'number' ? d.hourlyWage : Number(d.hourlyWage ?? 0),
    latitude: typeof d.latitude === 'number' ? d.latitude : Number(d.latitude ?? 0),
    longitude: typeof d.longitude === 'number' ? d.longitude : Number(d.longitude ?? 0),
    status: mapStatus(d.status),
  };
}

// ----------------- provider -----------------
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User>(defaultUser);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([
    { day: 'saturday', available: true,  startTime: '09:00', endTime: '17:00' },
    { day: 'sunday',   available: true,  startTime: '10:00', endTime: '16:00' },
    { day: 'monday',   available: true,  startTime: '08:00', endTime: '16:00' },
    { day: 'tuesday',  available: true,  startTime: '08:00', endTime: '16:00' },
    { day: 'wednesday',available: false },
    { day: 'thursday', available: true,  startTime: '09:00', endTime: '17:00' },
    { day: 'friday',   available: false },
  ]);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  // Subscribe to shifts (supports portal + app shapes)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'shifts'),
      (snapshot) => {
        const rows: Shift[] = [];
        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data() as any;
          if ('eventName' in d) {
            rows.push(...expandPortalShift(docSnap));
          } else {
            const s = mapAppShift(docSnap);
            if (s) rows.push(s);
          }
        });
        rows.sort((a, b) => {
          const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
          return tb - ta;
        });
        setShifts(rows);
      },
      (error) => console.error('Shifts subscription error:', error)
    );
    return () => unsub();
  }, []);

  // ----------------- punch I/O (Firestore) -----------------
  const punchIn = async (shiftIdVirtual: string) => {
    if (!user.id) { alert('Not signed in.'); return; }

    // Resolve the real shift doc id and user id
    const { shiftDocId, userIdInId } = parseCompositeShiftId(shiftIdVirtual);
    const punchUserId = userIdInId || user.id;

    const punchRef = doc(db, 'shifts', shiftDocId, 'punches', punchUserId);

    // prevent double punch-in
    const existing = await getDoc(punchRef);
    const ex = existing.exists() ? existing.data() as any : null;
    if (ex?.punchInAt && !ex?.punchOutAt) {
      alert('Already punched in.');
      return;
    }

    await setDoc(
      punchRef,
      {
        punchInAt: serverTimestamp(),
        source: 'app',
      },
      { merge: true }
    );

    const nowISO = new Date().toISOString();
    setShifts(prev =>
      prev.map(s =>
        s.id === shiftIdVirtual ? { ...s, status: 'in-progress', startTime: s.startTime ?? nowISO } : s
      )
    );
  };

  const punchOut = async (shiftIdVirtual: string) => {
    if (!user.id) { alert('Not signed in.'); return; }

    const { shiftDocId, userIdInId } = parseCompositeShiftId(shiftIdVirtual);
    const punchUserId = userIdInId || user.id;
    const punchRef = doc(db, 'shifts', shiftDocId, 'punches', punchUserId);

    const snap = await getDoc(punchRef);
    if (!snap.exists()) {
      alert('No punch-in record found.');
      return;
    }
    const data = snap.data() as { punchInAt?: Timestamp; punchOutAt?: Timestamp; durationMin?: number };
    if (!data.punchInAt) {
      alert('No punch-in time found.');
      return;
    }
    if (data.punchOutAt) {
      alert('Already punched out.');
      return;
    }

    const startMs = data.punchInAt.toMillis();
    const endMs = Date.now();
    const durationMin = Math.max(0, Math.round((endMs - startMs) / 60000));

    await updateDoc(punchRef, {
      punchOutAt: serverTimestamp(),
      durationMin,
    });

    // Update local shift + user totals
    const nowISO = new Date().toISOString();
    setShifts(prev =>
      prev.map(shift => {
        if (shift.id !== shiftIdVirtual) return shift;
        // compute hours using scheduled or punch diff fallback
        let hours = 0;
        const start = shift.startTime ? new Date(shift.startTime).getTime() : startMs;
        const end = new Date(nowISO).getTime();
        hours = Math.max(0, (end - start) / 3_600_000);
        const hourly = shift.hourlyWage ?? 0;
        const earnings = hours * hourly;
        return {
          ...shift,
          status: 'completed',
          endTime: shift.endTime ?? nowISO,
          totalHours: Math.round(hours * 100) / 100,
          earnings: Math.round(earnings * 100) / 100,
        };
      })
    );

    setUser(prev => ({
      ...prev,
      totalHours: Math.round((prev.totalHours + durationMin / 60) * 100) / 100,
    }));
  };

  // ----------------- other actions -----------------
  const updateProfile = (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const logout = () => {
    setUser(defaultUser);
    setCurrentPage('home');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        shifts,
        availability,
        currentPage,
        selectedShift,
        language,
        setUser,
        setShifts,
        setAvailability,
        setCurrentPage,
        setSelectedShift,
        setLanguage,
        punchIn,
        punchOut,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};