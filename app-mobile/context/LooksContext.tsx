import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../services/firebase";
import { API_BASE_URL } from "../config/api";


export type Look = {
  id: string; // clientId (string)
  imageUri: string | null;
  score: number | null;
  vibe: string | null;
  tags: string[];
  notes: string[];
  analysis?: string[];
  suggestions?: string[];
  analysisShort?: string[];
  suggestionsShort?: string[];
  createdAt: number; // timestamp (ms)
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
    analysis?: string[];
    suggestions?: string[];
    analysisShort?: string[];
    suggestionsShort?: string[];
    createdAt?: number;
  }) => void;
  deleteLook: (id: string) => void;
  clearLooks: () => void;
  refreshFromBackend: () => Promise<void>;
};

const LooksContext = createContext<LooksContextValue | undefined>(undefined);

const STORAGE_KEY = "@wardrobe_looks_v2";

export function LooksProvider({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<Look[]>([]);

  // --- Helper: map backend doc to local Look shape ---
  const mapBackendLookToLocal = (doc: any): Look | null => {
  if (!doc) return null;

  const id: string =
    doc.clientId ||
    doc.id ||
    doc._id ||
    Math.random().toString(36).slice(2);

  const createdAtMs =
    doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now();

  return {
    id,
    imageUri: doc.imageUrl ?? null,
    score:
      typeof doc.score === "number"
        ? doc.score
        : doc.score != null
        ? Number(doc.score)
        : null,
    vibe: typeof doc.vibe === "string" ? doc.vibe : null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    notes: Array.isArray(doc.notes) ? doc.notes : [],
    analysis: Array.isArray(doc.analysis) ? doc.analysis : undefined,
    suggestions: Array.isArray(doc.suggestions) ? doc.suggestions : undefined,
    analysisShort: Array.isArray(doc.analysisShort)
      ? doc.analysisShort
      : undefined,
    suggestionsShort: Array.isArray(doc.suggestionsShort)
      ? doc.suggestionsShort
      : undefined,
    createdAt: createdAtMs,
  };
};

  // --- 1) Initial load from AsyncStorage ---
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
            "looks from AsyncStorage"
          );
        } else {
          console.log("LooksContext: no stored looks found");
        }
      } catch (err) {
        console.log("LooksContext: failed to load from AsyncStorage", err);
      }
    })();
  }, []);

  // --- 2) Persist to AsyncStorage on every change ---
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(looks));
      } catch (err) {
        console.log("LooksContext: failed to save to AsyncStorage", err);
      }
    })();
  }, [looks]);

  // --- 3) Fetch wardrobe from backend (source of truth) ---
  const refreshFromBackend = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log(
          "LooksContext.refreshFromBackend: no user, skipping fetch"
        );
        return;
      }

      const token = await user.getIdToken();

      const url = `${API_BASE_URL}/wardrobe?ts=${Date.now()}`;
      console.log("LooksContext: fetching wardrobe from backend…", url);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        // @ts-ignore – supported on web, ignored on native
        cache: "no-store",
      });

      if (res.status === 304) {
        console.log(
          "LooksContext.refreshFromBackend: 304 Not Modified → keeping existing looks"
        );
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log(
          "LooksContext.refreshFromBackend: backend error",
          res.status,
          text
        );
        return;
      }

      const json = await res.json();

      // 🔍 Debug log so we can see what backend really sends
      try {
        console.log(
          "LooksContext: raw wardrobe JSON from backend:",
          JSON.stringify(json).slice(0, 600)
        );
      } catch (e) {
        console.log("LooksContext: could not stringify wardrobe JSON", e);
      }

      // Flexible shape: try multiple common patterns
      let rawList: any[] = [];

      if (Array.isArray(json)) {
        rawList = json;
      } else if (Array.isArray((json as any).items)) {
        rawList = (json as any).items;
      } else if (Array.isArray((json as any).data)) {
        rawList = (json as any).data;
      } else if (Array.isArray((json as any).wardrobe)) {
        rawList = (json as any).wardrobe;
      } else if (Array.isArray((json as any).looks)) {
        rawList = (json as any).looks;
      } else if (Array.isArray((json as any).results)) {
        rawList = (json as any).results;
      } else if (Array.isArray((json as any).records)) {
        rawList = (json as any).records;
      } else if (Array.isArray((json as any).docs)) {
        rawList = (json as any).docs;
      } else {
        console.log(
          "LooksContext: no known list key found on wardrobe JSON, defaulting to []"
        );
      }

      const mapped: Look[] = rawList
        .map(mapBackendLookToLocal)
        .filter((x): x is Look => x !== null)
        .sort((a, b) => b.createdAt - a.createdAt);

      console.log(
        "LooksContext: backend wardrobe mapped:",
        mapped.length,
        "items"
      );

      setLooks(mapped);
    } catch (err) {
      console.log("LooksContext.refreshFromBackend: error", err);
    }
  };

  // --- 4) React to auth changes (login/logout) ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log(
          "LooksContext: auth state changed → user logged in, syncing wardrobe"
        );
        await refreshFromBackend();
      } else {
        console.log(
          "LooksContext: auth state changed → user logged out, clearing wardrobe"
        );
        setLooks([]);
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (err) {
          console.log(
            "LooksContext: failed to clear AsyncStorage on logout",
            err
          );
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 5) Local mutations ---

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
    analysis: input.analysis,
    suggestions: input.suggestions,
    analysisShort: input.analysisShort,
    suggestionsShort: input.suggestionsShort,
  };

  setLooks((prev) => [newLook, ...prev]);
};


  const deleteLook: LooksContextValue["deleteLook"] = (id) => {
    setLooks((prev) => prev.filter((look) => look.id !== id));

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
    <LooksContext.Provider
      value={{
        looks,
        addLook,
        deleteLook,
        clearLooks,
        refreshFromBackend,
      }}
    >
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
