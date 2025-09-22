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
  runTransaction,
  serverTimestamp
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
  punchIn: (shiftId: string) => void;   // keeps your signature
  punchOut: (shiftId: string) => void;  // keeps your signature
  updateProfile: (updates: Partial<User>) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
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

// Helpers
function tsToDate(v: any): Date | null {
  if (!v) return null;
  if (typeof (v as any).toDate === 'function') return (v as any).toDate();
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

function expandPortalShift(doc: QueryDocumentSnapshot<DocumentData>): Shift[] {
  const d = doc.data() as any;
  // Required portal fields check
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
      id: `${doc.id}_${uid}_${idx}`, // per-user virtual id (may not exist as a Firestore doc)
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

function mapAppShift(doc: QueryDocumentSnapshot<DocumentData>): Shift | null {
  const d = doc.data() as any;
  if (!('title' in d) || !('userId' in d)) return null;
  return {
    id: doc.id,
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

  // Subscribe to shifts and support BOTH shapes
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'shifts'),
      (snapshot) => {
        const rows: Shift[] = [];
        snapshot.docs.forEach(doc => {
          const d = doc.data() as any;
          if ('eventName' in d) {
            rows.push(...expandPortalShift(doc));
          } else {
            const s = mapAppShift(doc);
            if (s) rows.push(s);
          }
        });
        // sort by start time desc
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

  // ---------- Firestore-backed punch in/out with graceful fallback ----------

  const doLocalPunchIn = (shiftId: string) => {
    const now = new Date().toISOString();
    setShifts(prev =>
      prev.map(shift =>
        shift.id === shiftId
          ? { ...shift, status: 'in-progress', startTime: shift.startTime ?? now }
          : shift
      )
    );
  };

  const doLocalPunchOut = (shiftId: string) => {
    const now = new Date().toISOString();
    setShifts(prev =>
      prev.map(shift => {
        if (shift.id === shiftId && shift.startTime) {
          const startTime = new Date(shift.startTime);
          const endTime = new Date(now);
          const totalHours = (endTime.getTime() - startTime.getTime()) / 3600000;
          const earnings = totalHours * (shift.hourlyWage ?? 0);
          return {
            ...shift,
            status: 'completed',
            endTime: now,
            totalHours: Math.round(totalHours * 100) / 100,
            earnings:   Math.round(earnings   * 100) / 100,
          } as any;
        }
        return shift;
      })
    );
    // Update user total hours locally
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && shift.startTime) {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(now);
      const totalHours = (endTime.getTime() - startTime.getTime()) / 3600000;
      setUser(prev => ({
        ...prev,
        totalHours: prev.totalHours + Math.round(totalHours * 100) / 100,
      }));
    }
  };

  // Keep your function signatures (void). Do async work inside.
  const punchIn = (shiftId: string) => {
    (async () => {
      try {
        // Try to update a real Firestore doc first
        await runTransaction(db, async (tx) => {
          const ref = doc(db, 'shifts', shiftId);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('NO_DOC'); // fall back

          const s = snap.data() as any;
          const start = s.startTime ? new Date(s.startTime).getTime() : 0;
          const end = s.endTime ? new Date(s.endTime).getTime() : 0;
          const now = Date.now();

          if (!start || !end) throw new Error('Shift window not set');
          if (now < start) throw new Error('Too early to punch in');
          if (now > end) throw new Error('Too late to punch in');

          tx.update(ref, {
            status: 'in-progress',
            userId: s.userId ?? user.id ?? '',
            punchedInAt: serverTimestamp(),
          });
          const log = doc(collection(ref, 'timeEntries'));
          tx.set(log, { type: 'in', at: serverTimestamp(), uid: user.id ?? '' });
        });

        // mirror to local state quickly
        doLocalPunchIn(shiftId);
      } catch (e: any) {
        // If the document doesn't exist (virtual portal id), fall back to local
        if (e?.message === 'NO_DOC') {
          console.warn('Firestore doc not found for shiftId, using local punch-in:', shiftId);
          doLocalPunchIn(shiftId);
        } else {
          alert(e?.message ?? 'Punch-in failed');
        }
      }
    })();
  };

  const punchOut = (shiftId: string) => {
    (async () => {
      try {
        await runTransaction(db, async (tx) => {
          const ref = doc(db, 'shifts', shiftId);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('NO_DOC');

          tx.update(ref, {
            status: 'completed',
            punchedOutAt: serverTimestamp(),
          });
          const log = doc(collection(ref, 'timeEntries'));
          tx.set(log, { type: 'out', at: serverTimestamp(), uid: user.id ?? '' });
        });

        doLocalPunchOut(shiftId);
      } catch (e: any) {
        if (e?.message === 'NO_DOC') {
          console.warn('Firestore doc not found for shiftId, using local punch-out:', shiftId);
          doLocalPunchOut(shiftId);
        } else {
          alert(e?.message ?? 'Punch-out failed');
        }
      }
    })();
  };

  // ------------------------------------------------------------------------

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
