// app-mobile/context/AuthContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
  } from "react";
  import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
  } from "firebase/auth";
  import { auth } from "../services/firebase";
  
  type AuthContextValue = {
    user: User | null;
    loading: boolean; // only for initial auth check
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOutUser: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | undefined>(undefined);
  
  export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log("Auth state changed:", firebaseUser?.email ?? "no user");
        setUser(firebaseUser);
        setLoading(false);
      });
  
      return unsubscribe;
    }, []);
  
    const signIn = async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will fire and update `user`
    };
  
    const signUp = async (email: string, password: string) => {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will fire and update `user`
    };
  
    const signOutUser = async () => {
      await signOut(auth);
    };
  
    return (
      <AuthContext.Provider value={{ user, loading, signIn, signUp, signOutUser }}>
        {children}
      </AuthContext.Provider>
    );
  };
  
  export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
  };
  