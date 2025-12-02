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
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../services/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const createdUser = cred.user;

    // Give them a default display name derived from email
    if (createdUser && !createdUser.displayName) {
      const nameFromEmail = deriveNameFromEmail(createdUser.email ?? "");
      try {
        await updateProfile(createdUser, { displayName: nameFromEmail });
      } catch (error) {
        console.log("AuthContext: updateProfile failed after signUp", error);
      }
    }
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
  };

  const updateDisplayName = async (displayName: string) => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }

    const trimmed = displayName.trim();
    await updateProfile(auth.currentUser, { displayName: trimmed });

    // refresh local state
    setUser({ ...(auth.currentUser as User) });
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("No authenticated user email");
    }

    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );

    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOutUser,
        updateDisplayName,
        changePassword,
      }}
    >
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

// Helper for default name
const deriveNameFromEmail = (email: string): string => {
  if (!email) return "Stylist";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Stylist";
  const first = cleaned.split(" ")[0];
  if (!first) return "Stylist";
  return first.charAt(0).toUpperCase() + first.slice(1);
};
