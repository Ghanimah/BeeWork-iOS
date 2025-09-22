import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { User } from "../types";

interface AuthContextType {
  user: User;
  setUser: (user: User) => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const defaultUser: User = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  rating: 0,
  totalHours: 0,
  language: "en",
  role: "employee",
  profilePicture: "",
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User>(defaultUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            rating: data.rating || 0,
            totalHours: data.totalHours || 0,
            language: data.language || "en",
            role: data.role || "employee",
            profilePicture: data.profilePicture || "",
          });
        } else {
          // user doc not found, still set minimal user from Firebase
          setUser({
            ...defaultUser,
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
          });
        }
      } else {
        setUser(defaultUser);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateProfile = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};