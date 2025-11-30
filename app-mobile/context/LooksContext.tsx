// app-mobile/context/LooksContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../services/firebase"; // 👈 keep this path as in your project

export type Look = {
  id: string;             // clientId (string)
  imageUri: string | null;
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
  createdAt: number;
};

type LooksContextValue = {
  looks: Look[];
  addLook: (input: {
    id?: string;
    imageUri: string | null;
    score: number | null;
    vibe: string | null;
    tags: string[];
    notes: string[];
    createdAt?: number;
  }) => void;
  deleteLook: (id: string) => void;
  clearLooks: () => void;
};

const LooksContext = createContext<LooksContextValue | undefined>(undefined);

// New, clean storage key
const STORAGE_KEY = "@wardrobe_looks_v2";

// Same as backend
const API_BASE_URL = "http://localhost:4000/api";

export function LooksProvider({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<Look[]>([]);

  // 1) Load from AsyncStorage once
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Look[] = JSON.parse(stored);
          setLooks(parsed);
          console.log(
            "LooksContext: hydrated",
            parsed.length,
            "looks from storage"
          );
        } else {
          console.log("LooksContext: no stored looks found");
        }
      } catch (err) {
        console.log("LooksContext: failed to load from AsyncStorage", err);
      }
    })();
  }, []);

  // 2) Save to AsyncStorage every time looks changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(looks));
      } catch (err) {
        console.log("LooksContext: failed to save to AsyncStorage", err);
      }
    })();
  }, [looks]);

  const addLook: LooksContextValue["addLook"] = (input) => {
    const id = input.id ?? Math.random().toString(36).slice(2);
    const createdAt = input.createdAt ?? Date.now();

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
    // Local delete
    setLooks((prev) => prev.filter((look) => look.id !== id));

    // Backend delete (Mongo + S3) – by clientId
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log(
            "LooksContext.deleteLook: no current user, skipping backend delete"
          );
          return;
        }

        const token = await user.getIdToken();

        const res = await fetch(`${API_BASE_URL}/wardrobe/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok && res.status !== 404) {
          const text = await res.text();
          console.log(
            "LooksContext.deleteLook: backend delete failed",
            res.status,
            text
          );
        } else {
          console.log("LooksContext.deleteLook: backend delete ok for", id);
        }
      } catch (err) {
        console.log("LooksContext.deleteLook: error calling backend", err);
      }
    })();
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
