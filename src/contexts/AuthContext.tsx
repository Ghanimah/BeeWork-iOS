import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, Shift, Availability, Page } from '../types';

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
  punchIn: (shiftId: string) => void;
  punchOut: (shiftId: string) => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AuthProvider');
  return context;
};

// Optional compatibility for legacy use
export const useAuth = useApp;

interface AppProviderProps {
  children: ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    rating: 0,
    totalHours: 0,
    language: 'en',
    role: 'employee',
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            rating: data.rating || 0,
            totalHours: data.totalHours || 0,
            language: data.language || 'en',
            role: data.role || 'employee',
            profilePicture: data.profilePicture || '',
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const punchIn = (shiftId: string) => {
    const now = new Date().toISOString();
    setShifts(prev =>
      prev.map(shift =>
        shift.id === shiftId ? { ...shift, status: 'in-progress', startTime: now } : shift
      )
    );
  };

  const punchOut = (shiftId: string) => {
    const now = new Date().toISOString();
    setShifts(prev =>
      prev.map(shift => {
        if (shift.id === shiftId && shift.startTime) {
          const startTime = new Date(shift.startTime);
          const endTime = new Date(now);
          const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          const earnings = totalHours * shift.hourlyWage;

          return {
            ...shift,
            status: 'completed',
            endTime: now,
            totalHours: Math.round(totalHours * 100) / 100,
            earnings: Math.round(earnings * 100) / 100,
          };
        }
        return shift;
      })
    );

    const shift = shifts.find(s => s.id === shiftId);
    if (shift?.startTime) {
      const start = new Date(shift.startTime);
      const end = new Date(now);
      const total = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      setUser(prev => ({
        ...prev,
        totalHours: prev.totalHours + Math.round(total * 100) / 100,
      }));
    }
  };

  const updateProfile = (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export { AppProvider as AuthProvider };
