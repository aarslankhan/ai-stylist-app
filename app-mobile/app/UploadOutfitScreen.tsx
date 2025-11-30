// app-mobile/app/UploadOutfitScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useLooks } from "../context/LooksContext";
import { auth } from "../services/firebase";

type AiResult = {
  score: number;
  vibe: string;
  notes: string[];
  tags: string[];
};

const API_BASE_URL = "http://localhost:4000/api"; // change to your server URL if needed

export default function UploadOutfitScreen() {
  const navigation = useNavigation<any>();
  const { addLook } = useLooks();

  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

  // 1) Pick image from gallery
  const handlePickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need access to your photos to pick an outfit."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      base64: true, // 👈 we need this for backend upload
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    setImageUri(asset.uri ?? null);
    setImageAspectRatio(
      asset.width && asset.height ? asset.width / asset.height : null
    );
    setImageBase64(asset.base64 ?? null);

    console.log("Picked image:", {
      uri: asset.uri,
      hasBase64: !!asset.base64,
      width: asset.width,
      height: asset.height,
    });
  };

  // 2) Backend sync helper (backend handles S3 upload)
  const syncLookToBackend = async (
    clientId: string,
    dataUrl: string,
    ai: AiResult
  ): Promise<string | null> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No Firebase user, skipping backend sync.");
        return null;
      }

      const token = await currentUser.getIdToken();

      // 1) Upload image to backend (which uploads to S3)
      console.log("Sending base64 image to backend /upload-image");
      const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: dataUrl, // 👈 backend expects this
        }),
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        console.log(
          "❌ Failed to upload image to backend/S3:",
          uploadRes.status,
          text
        );
        return null;
      }

      const uploadJson = await uploadRes.json();
      const s3Url: string | undefined = uploadJson.url; // backend returns { url }

      if (!s3Url) {
        console.log("Upload endpoint did not return a URL.");
        return null;
      }

      console.log("✅ Backend returned S3 URL:", s3Url);

      // 2) Create wardrobe entry with S3 URL + clientId
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
          notes: ai.notes,
        }),
      });

      if (!wardrobeRes.ok) {
        const text = await wardrobeRes.text();
        console.log(
          "❌ Failed to sync look to backend wardrobe:",
          wardrobeRes.status,
          text
        );
        return null;
      }

      console.log("✅ Look synced to backend with S3 URL", s3Url);
      return s3Url;
    } catch (err) {
      console.log("❌ Error syncing look to backend:", err);
      return null;
    }
  };

  // 3) Mock AI analysis
  const handleMockAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const mock: AiResult = {
        score: 8.4,
        vibe: "Smart casual with a clean streetwear twist",
        notes: [
          "Great balance between neutral base and one statement piece.",
          "Shoes and top are aligned in vibe, but you could add a subtle accessory.",
          "Color palette works well – consider adding texture for extra depth.",
        ],
        tags: ["Smart casual", "Street clean", "IG-ready", "Balanced colors"],
      };
      setAiResult(mock);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleReset = () => {
    setImageUri(null);
    setImageBase64(null);
    setAiResult(null);
    setImageAspectRatio(null);
  };

  // 4) Save to wardrobe
  const handleSaveToWardrobe = async () => {
    if (!aiResult) {
      Alert.alert("No rating yet", "Analyze your outfit first.");
      return;
    }

    if (!imageBase64 && !imageUri) {
      Alert.alert("No image", "Pick an image first.");
      return;
    }

    if (!imageBase64) {
      Alert.alert(
        "Missing data",
        "For now we need the base64 data to upload this image. Please re-pick the image."
      );
      return;
    }

    // Build a data URL for backend (matches what worked before)
    const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

    const clientId = Math.random().toString(36).slice(2);
    setIsSaving(true);
    console.log("🔄 Saving look with clientId:", clientId);

    try {
      const s3Url = await syncLookToBackend(clientId, dataUrl, aiResult);

      if (!s3Url) {
        Alert.alert(
          "Upload failed",
          "Could not upload outfit to wardrobe. Please try again."
        );
        return;
      }

      // Update local wardrobe state
      addLook({
        id: clientId,
        imageUri: s3Url,
        score: aiResult.score,
        vibe: aiResult.vibe,
        tags: aiResult.tags,
        notes: aiResult.notes,
      });

      console.log("✅ Added look locally, navigating home.");
      navigation.navigate("Home");
    } catch (err) {
      console.log("❌ Failed to save outfit to wardrobe:", err);
      Alert.alert(
        "Error",
        "Could not save this outfit. Please try again in a moment."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      {/* soft color blobs in the background */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Text style={styles.backText}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Today’s outfit</Text>
        </View>

        <View style={styles.topRight}>
          <Text style={styles.betaTag}>Prototype · No real AI yet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainRow}>
          {/* LEFT: Outfit image picker + placeholder */}
          <View style={styles.left}>
            <Text style={styles.sectionTitle}>1. Add your outfit photo</Text>
            <Text style={styles.sectionSubtitle}>
              Pick a photo from your device. Later we’ll plug this into real AI
              that understands your outfit.
            </Text>

            <View style={styles.outfitPlaceholder}>
              <Image
                style={[
                  styles.outfitImage,
                  imageAspectRatio ? { aspectRatio: imageAspectRatio } : null,
                ]}
                source={{
                  uri: imageUri ?? FALLBACK_IMAGE,
                }}
                resizeMode="contain"
              />

              <Text style={styles.outfitLabel}>
                {imageUri
                  ? "Selected outfit"
                  : "Outfit image placeholder (using stock photo)"}
              </Text>
              <Text style={styles.outfitBody}>
                Replace this with a full-body photo of your outfit. This card is
                what users will see every time they upload.
              </Text>
              <Text style={styles.outfitHint}>
                You can redesign this later with your own brand shots, phone
                mockups, or a collage layout.
              </Text>
            </View>

            <View style={styles.uploadButtonsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.buttonMargin]}
                onPress={handlePickImage}
              >
                <Text style={styles.secondaryButtonText}>
                  {imageUri ? "Change photo" : "Choose photo"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.buttonMargin,
                  isAnalyzing && { opacity: 0.7 },
                ]}
                onPress={handleMockAnalyze}
                disabled={isAnalyzing}
              >
                <Text style={styles.primaryButtonText}>
                  {isAnalyzing ? "Analyzing outfit..." : "Analyze this outfit"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resetButton, styles.buttonMargin]}
                onPress={handleReset}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.miniNote}>
              For now, images are uploaded via your backend to S3 and then
              stored in your cloud wardrobe (MongoDB).
            </Text>
          </View>

          {/* RIGHT: AI rating + feedback */}
          <View style={styles.right}>
            <Text style={styles.sectionTitle}>2. AI outfit rating</Text>
            <Text style={styles.sectionSubtitle}>
              This is a mock of the final experience. We’ll later replace it
              with live data from your backend.
            </Text>

            <View style={styles.aiCard}>
              {aiResult ? (
                <>
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreCircle}>
                      <Text style={styles.scoreValue}>
                        {aiResult.score.toFixed(1)}
                      </Text>
                      <Text style={styles.scoreLabel}>/10</Text>
                    </View>
                    <View style={styles.scoreTextCol}>
                      <Text style={styles.scoreTitle}>Nice fit ✨</Text>
                      <Text style={styles.scoreSubtitle}>{aiResult.vibe}</Text>
                    </View>
                  </View>

                  <View style={styles.notesList}>
                    {aiResult.notes.map((line, index) => (
                      <View key={index} style={styles.noteRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.noteText}>{line}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.tagsRow}>
                    {aiResult.tags.map((tag, index) => (
                      <View key={index} style={styles.tagPill}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.outlineButton, styles.buttonMargin]}
                      onPress={() => {
                        console.log("TODO: Generate share card");
                      }}
                    >
                      <Text style={styles.outlineButtonText}>
                        Export as share card
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.outlineButton,
                        styles.buttonMargin,
                        isSaving && { opacity: 0.7 },
                      ]}
                      onPress={handleSaveToWardrobe}
                      disabled={isSaving}
                    >
                      <Text style={styles.outlineButtonText}>
                        {isSaving ? "Saving..." : "Save to wardrobe"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyAiState}>
                  <Text style={styles.emptyAiTitle}>No rating yet</Text>
                  <Text style={styles.emptyAiBody}>
                    Choose a photo and hit “Analyze this outfit” to see how your
                    AI stylist would talk about your look.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.bottomHint}>
              <Text style={styles.bottomHintTitle}>
                What this screen will eventually do
              </Text>
              <Text style={styles.bottomHintBody}>
                • Accept a real image upload (web + mobile).{"\n"}
                • Send it to your AI backend for analysis.{"\n"}
                • Return a style score, outfit type, and concrete suggestions.
                {"\n"}
                • Let users save the outfit, export it as an IG story card, and
                store it in their digital wardrobe.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#020617",
  },
  bgBlobPurple: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(129,140,248,0.35)",
    opacity: 0.7,
  },
  bgBlobPink: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(244,114,182,0.35)",
    opacity: 0.7,
  },
  topBar: {
    height: 56,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#0B1120",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  topRight: {},
  betaTag: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  mainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  left: {
    flex: 1,
    minWidth: 280,
    marginRight: 16,
    marginBottom: 20,
  },
  right: {
    flex: 1,
    minWidth: 280,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#CBD5F5",
    marginBottom: 10,
  },
  outfitPlaceholder: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    padding: 14,
    justifyContent: "flex-start",
    backgroundColor: "rgba(15,23,42,0.96)",
    marginBottom: 12,
  },
  outfitImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    maxHeight: 360,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: "#020617",
  },
  outfitLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 3,
  },
  outfitBody: {
    fontSize: 13,
    color: "#E5E7EB",
    marginBottom: 4,
  },
  outfitHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  uploadButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  buttonMargin: {
    marginRight: 8,
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  secondaryButtonText: {
    fontSize: 13,
    color: "#E5E7EB",
  },
  resetButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: "transparent",
  },
  resetButtonText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  miniNote: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  aiCard: {
    marginTop: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "#111827",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#BBF7D0",
  },
  scoreLabel: {
    fontSize: 11,
    color: "#6EE7B7",
  },
  scoreTextCol: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 2,
  },
  scoreSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  notesList: {
    marginTop: 4,
    marginBottom: 10,
  },
  noteRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    color: "#9CA3AF",
    marginRight: 4,
    marginTop: 1,
  },
  noteText: {
    fontSize: 12,
    color: "#E5E7EB",
    flex: 1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(55,65,81,0.9)",
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: "#E5E7EB",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  outlineButtonText: {
    fontSize: 12,
    color: "#E5E7EB",
  },
  emptyAiState: {
    paddingVertical: 20,
  },
  emptyAiTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  emptyAiBody: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  bottomHint: {
    marginTop: 14,
  },
  bottomHintTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  bottomHintBody: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
  },
});
