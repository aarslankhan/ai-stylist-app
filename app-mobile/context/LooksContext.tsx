// app-mobile/context/LooksContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Look = {
  id: string;
  imageUri: string | null; // will be a data: URL or remote URL later
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
  createdAt: number;
};

type LooksContextValue = {
  looks: Look[];
  addLook: (input: {
    imageUri: string | null;
    score: number | null;
    vibe: string | null;
    tags: string[];
    notes: string[];
  }) => void;
  deleteLook: (id: string) => void;
  clearLooks: () => void;
};

const LooksContext = createContext<LooksContextValue | undefined>(undefined);

const STORAGE_KEY = "@ai-stylist/looks-v1";

export function LooksProvider({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<Look[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load saved looks once on mount
  useEffect(() => {
    const loadLooks = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Look[];
          if (Array.isArray(parsed)) {
            setLooks(parsed);
          }
        }
      } catch (err) {
        console.log("[LooksContext] Failed to load looks:", err);
      } finally {
        setHydrated(true);
      }
    };

    loadLooks();
  }, []);

  // Save looks on every change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;

    const saveLooks = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(looks));
      } catch (err) {
        console.log("[LooksContext] Failed to save looks:", err);
      }
    };

    saveLooks();
  }, [looks, hydrated]);

  const addLook: LooksContextValue["addLook"] = (input) => {
    const id = Math.random().toString(36).slice(2);
    const createdAt = Date.now();

    const newLook: Look = {
      id,
      createdAt,
      imageUri: input.imageUri ?? null,
      score: input.score ?? null,
      vibe: input.vibe ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? [],
    };

    setLooks((prev) => [newLook, ...prev]);
  };

  const deleteLook: LooksContextValue["deleteLook"] = (id) => {
    setLooks((prev) => prev.filter((look) => look.id !== id));
  };

  const clearLooks = () => {
    setLooks([]);
  };

  return (
    <LooksContext.Provider value={{ looks, addLook, deleteLook, clearLooks }}>
      {children}
    </LooksContext.Provider>
  );
}

export function useLooks() {
  const ctx = useContext(LooksContext);
  if (!ctx) {
    throw new Error("useLooks must be used within a LooksProvider");
  }
  return ctx;
}
