import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Role = "member" | "open" | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isMember: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      // Ignore anonymous sessions — used only for admin Firestore access
      if (!firebaseUser || firebaseUser.isAnonymous) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        setRole((snap.data()?.role as Role) ?? null);
      } catch (err) {
        console.error("Failed to fetch user role:", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, isMember: role === "member" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
