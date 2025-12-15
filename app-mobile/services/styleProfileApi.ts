// services/styleProfileApi.ts
import { API_BASE_URL } from "../config/api";
import { auth } from "./firebase";

export type PaletteColor = { hex: string; label: string };

export type StyleProfileResult = {
  bodyType: string;
  heightDisplay: string;
  heightCm?: number;
  skinToneCategory: string;
  undertone?: string;
  palette?: {
    name?: string;
    colors?: PaletteColor[];
  };
  dos?: string[];
  donts?: string[];
  bestSilhouettes?: string[];
  trickyAreasTips?: string[];
  createdAt?: string;
};

export async function fetchStyleProfile(): Promise<StyleProfileResult | null> {
  const token = await auth.currentUser?.getIdToken?.();

  const res = await fetch(`${API_BASE_URL}/ai/style-profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    console.log("fetchStyleProfile error", res.status, text);
    throw new Error("Failed to fetch style profile");
  }

  const json = (await res.json()) as StyleProfileResult;
  return json;
}

export async function deleteStyleProfile(): Promise<void> {
  const token = await auth.currentUser?.getIdToken?.();

  const res = await fetch(`${API_BASE_URL}/ai/style-profile`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.log("deleteStyleProfile error", res.status, text);
    throw new Error("Failed to delete style profile");
  }
}
