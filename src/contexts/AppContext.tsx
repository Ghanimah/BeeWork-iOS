import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { User, Shift, Availability, Page } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
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
  punchIn: (shiftId: string) => void;
  punchOut: (shiftId: string) => void;
  updateProfile: (updates: Partial<User>) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

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

  // 🔄 Subscribe to shifts collection in Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'shifts'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Shift, 'id'>)
        }));
        setShifts(data);
      },
      (error) => console.error('Shifts subscription error:', error)
    );
    return () => unsub();
  }, []);

  const punchIn = (shiftId: string) => {
    const now = new Date().toISOString();
    setShifts(prev =>
      prev.map(shift =>
        shift.id === shiftId
          ? { ...shift, status: 'in-progress', startTime: now }
          : shift
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
          const totalHours = (endTime.getTime() - startTime.getTime()) / 3600000;
          const earnings = totalHours * shift.hourlyWage;
          return {
            ...shift,
            status: 'completed',
            endTime: now,
            totalHours: Math.round(totalHours * 100) / 100,
            earnings:   Math.round(earnings   * 100) / 100,
          };
        }
        return shift;
      })
    );

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
