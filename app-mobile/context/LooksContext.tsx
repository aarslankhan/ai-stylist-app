// app-mobile/context/LooksContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage, auth } from "../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type Look = {
  id: string;
  imageUri: string | null; // Firebase HTTPS URL or data URL for now
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
  createdAt: number; // timestamp
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
const API_BASE_URL = "http://localhost:4000/api";

export function LooksProvider({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<Look[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 1) Load looks from AsyncStorage on mount
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
        console.log("Failed to load looks from storage:", err);
      } finally {
        setHydrated(true);
      }
    };

    loadLooks();
  }, []);

  // 2) Save looks to AsyncStorage whenever they change (after hydrate)
  useEffect(() => {
    if (!hydrated) return;

    const saveLooks = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(looks));
      } catch (err) {
        console.log("Failed to save looks to storage:", err);
      }
    };

    saveLooks();
  }, [looks, hydrated]);

  // 3) After local hydrate, pull latest wardrobe from backend (cloud truth)
  useEffect(() => {
    if (!hydrated) return;

    const fetchFromBackend = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          // not logged in → keep whatever local looks exist
          return;
        }

        const token = await user.getIdToken();

        const res = await fetch(`${API_BASE_URL}/wardrobe`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.log(
            "Failed to fetch wardrobe from backend:",
            res.status,
            text
          );
          return;
        }

        const data = await res.json();

        if (!data || !Array.isArray(data.looks)) {
          console.log("Backend wardrobe response not in expected format.");
          return;
        }

        const remoteLooks: Look[] = data.looks.map((remote: any): Look => {
          const id = (remote._id || remote.id || Math.random().toString(36).slice(2)) as string;
          const created =
            remote.createdAt != null
              ? new Date(remote.createdAt).getTime()
              : Date.now();

          return {
            id,
            imageUri:
              typeof remote.imageUrl === "string" ? remote.imageUrl : null,
            score:
              typeof remote.score === "number" ? remote.score : remote.score ?? null,
            vibe:
              typeof remote.vibe === "string" ? remote.vibe : remote.vibe ?? null,
            tags: Array.isArray(remote.tags) ? remote.tags : [],
            notes: Array.isArray(remote.notes) ? remote.notes : [],
            createdAt: created,
          };
        });

        setLooks(remoteLooks);
      } catch (err) {
        console.log("Error fetching wardrobe from backend:", err);
      }
    };

    fetchFromBackend();
  }, [hydrated]);

  // Helper: robust upload using XMLHttpRequest (works better with file:/content:/blob:)
  const uploadImageToFirebase = async (
    uri: string,
    ownerId: string
  ): Promise<string> => {
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response as Blob);
      };
      xhr.onerror = function () {
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    try {
      const filename = `${ownerId}-${Date.now()}.jpg`;
      const storageRef = ref(storage, `looks/${ownerId}/${filename}`);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // @ts-ignore - blob may not have close in all environments
      if (typeof (blob as any).close === "function") {
        (blob as any).close();
      }

      return downloadUrl;
    } catch (err) {
      // Clean up blob if possible
      // @ts-ignore
      if (typeof (blob as any).close === "function") {
        (blob as any).close();
      }
      throw err;
    }
  };

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

    // Add immediately so UI updates fast
    setLooks((prev) => [newLook, ...prev]);

    // If we have an imageUri AND it's NOT already an HTTP(S) URL,
    // treat it as a local path that needs uploading.
    if (input.imageUri && !/^https?:\/\//i.test(input.imageUri)) {
      const currentUserId = auth.currentUser?.uid ?? "anonymous";

      (async () => {
        try {
          const remoteUrl = await uploadImageToFirebase(
            input.imageUri as string,
            currentUserId
          );

          // Replace this look's imageUri with the permanent Firebase URL
          setLooks((prev) =>
            prev.map((look) =>
              look.id === id ? { ...look, imageUri: remoteUrl } : look
            )
          );
        } catch (err) {
          console.log("Failed to upload look image:", err);
          // If upload fails, look still exists but might lose the image on restart.
        }
      })();
    }
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
 