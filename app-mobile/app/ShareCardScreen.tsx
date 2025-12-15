// app-mobile/app/ShareCardScreen.tsx
import React, { useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

// 🔥 CORRECT named import
import { ShareCard } from "../components/ShareCard";

import { useLooks } from "../context/LooksContext";
import type { RootStackParamList } from "../App";
import { auth } from "../services/firebase";
import { API_BASE_URL } from "../config/api";


// Local AI type – extended to support short lines for ShareCard
type ShareCardAi = {
  score: number;
  vibe: string;
  tags: string[];
  notes: string[];
  analysisShort?: string[];      // NEW: short analysis bullets for card
  suggestionsShort?: string[];   // NEW: short suggestion bullets for card
};

type ShareCardRoute = RouteProp<RootStackParamList, "ShareCard">;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

// helper to locally shorten lines if AI didn't send short versions
const toShort = (line: string, maxWords = 8): string =>
  line.split(/\s+/).slice(0, maxWords).join(" ");

const ShareCardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ShareCardRoute>();
  const { looks, addLook } = useLooks();

  const viewShotRef = useRef<ViewShot | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params = route.params ?? {};

  const { mode, imageUri, ai, existingLookId } = useMemo(() => {
    // Mode A: coming from UploadOutfit with fresh AI
    if (params.ai) {
      const rawAi: any = params.ai;

      const score =
        typeof rawAi.score === "number" ? rawAi.score : Number(rawAi.score ?? 7.5) || 7.5;
      const vibe =
        typeof rawAi.vibe === "string" ? rawAi.vibe : "Styled look";

      const tags: string[] = Array.isArray(rawAi.tags) ? rawAi.tags : [];
      const notes: string[] =
        Array.isArray(rawAi.notes) && rawAi.notes.length > 0
          ? rawAi.notes
          : [];

      // Long-form arrays from AURA, if present
      const fullAnalysis: string[] = Array.isArray(rawAi.analysis)
        ? rawAi.analysis
        : [];
      const fullSuggestions: string[] = Array.isArray(rawAi.suggestions)
        ? rawAi.suggestions
        : [];

      // Prefer AI-provided short arrays; otherwise derive locally from long ones or notes
      const analysisShort: string[] =
        Array.isArray(rawAi.analysisShort) && rawAi.analysisShort.length > 0
          ? rawAi.analysisShort
          : (fullAnalysis.length > 0
              ? fullAnalysis.map((line: string) => toShort(line))
              : notes.map((line: string) => toShort(line)));

      const suggestionsShort: string[] =
        Array.isArray(rawAi.suggestionsShort) &&
        rawAi.suggestionsShort.length > 0
          ? rawAi.suggestionsShort
          : fullSuggestions.map((line: string) => toShort(line));

      const aiFromParams: ShareCardAi = {
        score,
        vibe,
        notes,
        tags,
        analysisShort,
        suggestionsShort,
      };

      return {
        mode: "fresh" as const,
        imageUri: (params as any).imageUri ?? null,
        ai: aiFromParams,
        existingLookId: undefined,
      };
    }

    // Mode B: coming from Wardrobe / LookDetail with id
    if (params.id) {
      const existing = looks.find((l) => l.id === params.id);
      if (existing) {
        const anyExisting: any = existing;

        const score =
          typeof existing.score === "number"
            ? existing.score
            : Number(existing.score ?? 7.5) || 7.5;
        const vibe = existing.vibe || "Saved look";

        const tags: string[] = Array.isArray(existing.tags)
          ? existing.tags
          : [];
        const notes: string[] = Array.isArray(existing.notes)
          ? existing.notes
          : [];

        const analysisShort: string[] =
          Array.isArray(anyExisting.analysisShort) &&
          anyExisting.analysisShort.length > 0
            ? anyExisting.analysisShort
            : notes.map((line: string) => toShort(line));

        const suggestionsShort: string[] =
          Array.isArray(anyExisting.suggestionsShort) &&
          anyExisting.suggestionsShort.length > 0
            ? anyExisting.suggestionsShort
            : [];

        const aiFromLook: ShareCardAi = {
          score,
          vibe,
          notes,
          tags,
          analysisShort,
          suggestionsShort,
        };

        return {
          mode: "existing" as const,
          imageUri: existing.imageUri ?? null,
          ai: aiFromLook,
          existingLookId: existing.id,
        };
      }
    }

    return {
      mode: "empty" as const,
      imageUri: null,
      ai: null,
      existingLookId: undefined,
    };
  }, [params, looks]);

  if (mode === "empty" || !ai) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedText}>
          There&apos;s no outfit data to build a share card.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("UploadOutfit")}
        >
          <Text style={styles.primaryButtonText}>Upload an outfit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSaveToWardrobe = async () => {
    if (mode !== "fresh") return;

    if (!imageUri) {
      Alert.alert(
        "No photo",
        "We need an outfit photo to save this look to your wardrobe."
      );
      return;
    }

    try {
      setSaving(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Not signed in",
          "Please sign in before saving looks to your wardrobe."
        );
        setSaving(false);
        return;
      }

      const token = await currentUser.getIdToken();
      const combinedNotes = Array.isArray(ai.notes) ? ai.notes : [];

      const clientId =
        Math.random().toString(36).slice(2) + Date.now().toString(36);

      // Optimistic local add so wardrobe updates immediately
      addLook({
        id: clientId,
        imageUri: imageUri ?? null,
        score: ai.score ?? null,
        vibe: ai.vibe ?? null,
        tags: ai.tags ?? [],
        notes: combinedNotes,
        createdAt: Date.now(),
        // optional: if your Look type supports them now
        // analysisShort: ai.analysisShort,
        // suggestionsShort: ai.suggestionsShort,
      });

      const isWeb = Platform.OS === "web";

      if (isWeb) {
        // WEB: use base64 passed from UploadOutfitScreen if available
        const raw: any = params;
        const imageBase64Param: string | null =
          raw?.imageBase64 ?? null;

        if (!imageBase64Param) {
          console.log(
            "ShareCard WEB save: no base64 provided, skipping upload."
          );
        } else {
          console.log("▶ ShareCard WEB upload via /upload-image");

          const dataUrl = `data:image/jpeg;base64,${imageBase64Param}`;

          const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ imageBase64: dataUrl }),
          });

          if (!uploadRes.ok) {
            const text = await uploadRes.text();
            console.log(
              "❌ ShareCard WEB /upload-image failed:",
              uploadRes.status,
              text
            );
            throw new Error("Upload-image failed");
          }

          const uploadJson = await uploadRes.json();
          const s3Url: string | undefined =
            uploadJson.url || uploadJson.fileUrl || uploadJson.imageUrl;

          if (!s3Url) {
            console.log(
              "ShareCard WEB: no URL returned from /upload-image",
              uploadJson
            );
            throw new Error("No image URL from upload-image");
          }

          console.log("✅ ShareCard WEB got S3 URL:", s3Url);

          const wardrobeRes = await fetch(`${API_BASE_URL}/wardrobe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              clientId,
              imageUrl: s3Url,
              score: ai.score,
              vibe: ai.vibe,
              tags: ai.tags,
              notes: combinedNotes,
              // Optionally include short fields if backend schema supports:
              // analysisShort: ai.analysisShort,
              // suggestionsShort: ai.suggestionsShort,
            }),
          });

          if (!wardrobeRes.ok) {
            const text = await wardrobeRes.text();
            console.log(
              "❌ ShareCard WEB: failed to sync look to wardrobe:",
              wardrobeRes.status,
              text
            );
            throw new Error("Wardrobe save failed");
          }

          console.log("✅ ShareCard WEB: Look synced to wardrobe");
        }
      } else {
        // NATIVE: presign + PUT to S3 using imageUri
        console.log("▶ ShareCard NATIVE: requesting presigned URL…");

        const presignRes = await fetch(
          `${API_BASE_URL}/upload-image/presign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              mimeType: "image/jpeg",
            }),
          }
        );

        if (!presignRes.ok) {
          const text = await presignRes.text();
          console.log(
            "❌ ShareCard NATIVE: failed to get presigned URL:",
            presignRes.status,
            text
          );
          throw new Error("Presign failed");
        }

        const presignJson = await presignRes.json();
        const uploadUrl: string | undefined = presignJson.uploadUrl;
        const fileUrl: string | undefined = presignJson.fileUrl;

        if (!uploadUrl || !fileUrl) {
          console.log(
            "ShareCard NATIVE: response missing uploadUrl/fileUrl",
            presignJson
          );
          throw new Error("Missing uploadUrl or fileUrl");
        }

        console.log("✅ ShareCard NATIVE: got presigned URLs", {
          uploadUrl: uploadUrl.slice(0, 80) + "...",
          fileUrl,
        });

        const fileResponse = await fetch(imageUri);
        const blob = await (fileResponse as any).blob();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
          },
          body: blob,
        });

        if (!putRes.ok) {
          const text = await putRes.text().catch(() => "");
          console.log(
            "❌ ShareCard NATIVE: PUT to S3 failed:",
            putRes.status,
            text
          );
          throw new Error("S3 PUT failed");
        }

        console.log(
          "✅ ShareCard NATIVE: PUT to S3 OK, now creating wardrobe entry."
        );

        const wardrobeRes = await fetch(`${API_BASE_URL}/wardrobe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientId,
            imageUrl: fileUrl,
            score: ai.score,
            vibe: ai.vibe,
            tags: ai.tags,
            notes: combinedNotes,
            analysisShort: ai.analysisShort,
            suggestionsShort: ai.suggestionsShort,
          }),
        });

        if (!wardrobeRes.ok) {
          const text = await wardrobeRes.text();
          console.log(
            "❌ ShareCard NATIVE: failed to sync look to wardrobe:",
            wardrobeRes.status,
            text
          );
          throw new Error("Wardrobe save failed");
        }

        console.log("✅ ShareCard NATIVE: Look synced to wardrobe");
      }

      Alert.alert("Saved", "This look was added to your wardrobe.");
      navigation.navigate("Wardrobe");
    } catch (err) {
      console.log("Save to wardrobe from ShareCard error:", err);
      Alert.alert(
        "Save failed",
        "We couldn't save this look right now. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExportCard = async () => {
    if (!viewShotRef.current) {
      return;
    }

    try {
      setExporting(true);

      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        throw new Error("No URI from ViewShot");
      }

      if (Platform.OS === "web") {
        Alert.alert(
          "Export card",
          "Export works best on the mobile app build. Run this in Expo Go on your phone to share or save the card."
        );
        setExporting(false);
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos to save this card."
        );
        setExporting(false);
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Share your outfit card",
          mimeType: "image/png",
        });
      } else {
        Alert.alert("Saved", "Card saved to your gallery.");
      }
    } catch (err) {
      console.log("Export card error:", err);
      Alert.alert(
        "Export failed",
        "We couldn't export this card right now. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleBack = () => {
    if (mode === "fresh") {
      navigation.navigate("UploadOutfit");
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      {/* soft background blobs */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>
            ← {mode === "existing" ? "Look details" : "Upload"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.title}>Share card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.helperText}>
          Your AI outfit card is laid out in a 4:5 format, ready for Instagram
          stories, feeds, or reels covers.
        </Text>

        <ViewShot
          ref={viewShotRef}
          options={{
            format: "png",
            quality: 1,
          }}
          style={styles.viewShotWrapper}
        >
          <ShareCard
            imageUri={imageUri ?? null}
            fallbackImage={FALLBACK_IMAGE}
            ai={ai}
          />
        </ViewShot>

        <View style={styles.buttonRow}>
          {mode === "fresh" && (
            <TouchableOpacity
              style={[styles.secondaryButton, styles.buttonSpacing]}
              onPress={handleSaveToWardrobe}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>
                {saving ? "Saving…" : "Save to wardrobe"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, styles.buttonSpacing]}
            onPress={handleExportCard}
            disabled={exporting}
          >
            <Text style={styles.primaryButtonText}>
              {exporting ? "Exporting…" : "Export card"}
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "existing" && existingLookId && (
          <Text style={styles.footerHint}>
            This card is linked to a saved look. You can manage it from your
            wardrobe.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShareCardScreen;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

    bgBlobPurple: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(191,219,254,0.5)",
  },
  bgBlobPink: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(254,226,226,0.5)",
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  viewShotWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // the card itself
  card: {
    width: 320,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  brandText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#F3F4FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  scoreSuffix: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 2,
  },

  imageBlock: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#E5E7EB",
  },
  outfitImage: {
    width: "100%",
    height: 220,
  },

  analysisBlock: {
    marginTop: 4,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  analysisText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  suggestionsBlock: {
    marginTop: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#F3F4F6",
  },
  tagText: {
    fontSize: 11,
    color: "#4B5563",
  },

  footerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  appTag: {
    fontSize: 11,
    color: "#6B7280",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },

 

  buttonSpacing: {
    marginRight: 10,
    marginBottom: 10,
  },

  
  footerHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7280",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mutedText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 12,
  },
});
