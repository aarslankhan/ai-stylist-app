// app-mobile/app/UploadOutfitScreen.tsx
import React, { useState, memo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { useLooks } from "../context/LooksContext";
import { auth } from "../services/firebase";
import { API_BASE_URL } from "../config/api";

type AiResult = {
  score: number;
  vibe: string;
  analysis: string[];       // full
  suggestions: string[];    // full
  tags: string[];
  analysisShort?: string[];     // short (card)
  suggestionsShort?: string[];  // short (card)
};


const UploadOutfitScreenInner: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addLook } = useLooks();

  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Overlay + rotation for "Analyzing your look"
  const [showAnalyzingOverlay, setShowAnalyzingOverlay] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showAnalyzingOverlay) return;

    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();

    return () => {
      loop.stop();
      rotation.setValue(0);
    };
  }, [showAnalyzingOverlay, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

  const isWeb = Platform.OS === "web";

  // Prefill when coming from Wardrobe "Share card"
  useEffect(() => {
    const params: any = route.params;
    const prefill = params?.prefillLook;

    if (!prefill) return;

    if (prefill.imageUri) {
      setImageUri(prefill.imageUri);
      setImageAspectRatio(null);
    }

    if (
      typeof prefill.score === "number" ||
      prefill.vibe ||
      (Array.isArray(prefill.tags) && prefill.tags.length > 0) ||
      (Array.isArray(prefill.notes) && prefill.notes.length > 0)
    ) {
      const combinedNotes: string[] = Array.isArray(prefill.notes)
        ? prefill.notes.map(String)
        : [];

      setAiResult({
        score: prefill.score ?? 0,
        vibe: prefill.vibe ?? "",
        analysis: combinedNotes, // treat stored notes as "analysis"
        suggestions: [],
        tags: Array.isArray(prefill.tags) ? prefill.tags : [],
      });
    }
  }, [route]);

  // 1) Pick image (with compression on native)
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
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    let finalUri = asset.uri ?? null;
    let finalWidth = asset.width ?? null;
    let finalHeight = asset.height ?? null;
    let finalBase64: string | null = asset.base64 ?? null;
    let finalMimeType: string = (asset as any).mimeType || "image/jpeg";

    // Compress on native for faster uploads
    if (!isWeb && asset.uri) {
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1080 } }],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        finalUri = manipulated.uri ?? finalUri;
        finalWidth = manipulated.width ?? finalWidth;
        finalHeight = manipulated.height ?? finalHeight;
        if (manipulated.base64) finalBase64 = manipulated.base64;
        finalMimeType = "image/jpeg";
      } catch (err) {
        console.log("⚠️ Image compression failed, using original image", err);
      }
    }

    setImageUri(finalUri);
    setImageAspectRatio(
      finalWidth && finalHeight ? finalWidth / finalHeight : null
    );
    setImageMimeType(finalMimeType);
    setImageBase64(finalBase64);

    console.log("Picked image:", {
      originalUri: asset.uri,
      uri: finalUri,
      mimeType: finalMimeType,
      hasBase64: !!finalBase64,
      width: finalWidth,
      height: finalHeight,
      platform: Platform.OS,
    });
  };

  /**
   * 2) Upload helper:
   *    - On WEB → base64 → /upload-image
   *    - On NATIVE → presigned URL → PUT to S3
   */
  const syncLookToBackend = async (
    clientId: string,
    ai: AiResult
  ): Promise<string | null> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No Firebase user, skipping backend sync.");
        return null;
      }

      const token = await currentUser.getIdToken();
      const combinedNotes = [
        ...(ai.analysis || []),
        ...(ai.suggestions || []),
      ];

      // WEB path
      if (isWeb) {
        if (!imageBase64) {
          console.log("Web upload: no base64 available.");
          return null;
        }

        console.log("▶ WEB upload via /upload-image (base64 → S3)");

        const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

        const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageBase64: dataUrl,
          }),
        });

        if (!uploadRes.ok) {
          const text = await uploadRes.text();
          console.log(
            "❌ Web upload /upload-image failed:",
            uploadRes.status,
            text
          );
          return null;
        }

        const uploadJson = await uploadRes.json();
        const s3Url: string | undefined =
          uploadJson.url || uploadJson.fileUrl || uploadJson.imageUrl;

        if (!s3Url) {
          console.log(
            "Web upload: no URL returned from /upload-image.",
            uploadJson
          );
          return null;
        }

        console.log("✅ Web upload got S3 URL:", s3Url);

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
            analysis: ai.analysis,
            suggestions: ai.suggestions,
            analysisShort: ai.analysisShort,
            suggestionsShort: ai.suggestionsShort,
          }),
        });


        if (!wardrobeRes.ok) {
          const text = await wardrobeRes.text();
          console.log(
            "❌ Web: failed to sync look to wardrobe:",
            wardrobeRes.status,
            text
          );
          return null;
        }

        console.log("✅ Web: Look synced to wardrobe with S3 URL", s3Url);
        return s3Url;
      }

      // NATIVE path
      if (!imageUri) {
        console.log("Native upload: no imageUri.");
        return null;
      }

      console.log("▶ NATIVE upload: requesting presigned URL…");

      const presignRes = await fetch(`${API_BASE_URL}/upload-image/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mimeType: imageMimeType || "image/jpeg",
        }),
      });

      if (!presignRes.ok) {
        const text = await presignRes.text();
        console.log(
          "❌ Native: failed to get presigned URL:",
          presignRes.status,
          text
        );
        return null;
      }

      const presignJson = await presignRes.json();
      const uploadUrl: string | undefined = presignJson.uploadUrl;
      const fileUrl: string | undefined = presignJson.fileUrl;

      if (!uploadUrl || !fileUrl) {
        console.log(
          "Native presign: response missing uploadUrl/fileUrl",
          presignJson
        );
        return null;
      }

      console.log("✅ Native: got presigned URLs", {
        uploadUrl: uploadUrl.slice(0, 80) + "...",
        fileUrl,
      });

      const mimeType = imageMimeType || "image/jpeg";

      const fileResponse = await fetch(imageUri);
      const blob = await (fileResponse as any).blob();

      console.log("Native blob size:", blob.size);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: blob,
      });

      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "");
        console.log("❌ Native: PUT to S3 failed:", putRes.status, text);
        return null;
      }

      console.log("✅ Native: PUT to S3 OK, now creating wardrobe entry.");

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
          analysis: ai.analysis,
          suggestions: ai.suggestions,
          analysisShort: ai.analysisShort,
          suggestionsShort: ai.suggestionsShort,
        }),
      });


      if (!wardrobeRes.ok) {
        const text = await wardrobeRes.text();
        console.log(
          "❌ Native: failed to sync look to wardrobe:",
          wardrobeRes.status,
          text
        );
        return null;
      }

      console.log("✅ Native: Look synced to wardrobe with S3 URL", fileUrl);
      return fileUrl;
    } catch (err) {
      console.log("❌ Error in syncLookToBackend:", err);
      return null;
    }
  };

  // 3) AI analysis via backend + transition to ShareCard
  const handleAnalyze = async () => {
    if (!imageBase64) {
      Alert.alert("No image", "Please pick an outfit photo first.");
      return;
    }

    setShowAnalyzingOverlay(true);
    setIsAnalyzing(true);

    try {
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      const res = await fetch(`${API_BASE_URL}/ai/analyze-outfit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMimeType || "image/jpeg",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.log("❌ AI analyze failed:", res.status, text);
        Alert.alert(
          "AI error",
          "We couldn't analyze this outfit right now. Please try again in a moment."
        );
        return;
      }

      const json = await res.json();

      const ai: AiResult = {
        score:
          typeof json.score === "number"
            ? json.score
            : Number(json.score ?? 7.5) || 7.5,
        vibe: typeof json.vibe === "string" ? json.vibe : "Styled outfit",
        analysis: Array.isArray(json.analysis)
          ? json.analysis.map(String).slice(0, 6)
          : [],
        suggestions: Array.isArray(json.suggestions)
          ? json.suggestions.map(String).slice(0, 6)
          : [],
        tags: Array.isArray(json.tags)
          ? json.tags.map(String).slice(0, 8)
          : [],
        analysisShort: Array.isArray(json.analysisShort)
          ? json.analysisShort.map(String).slice(0, 6)
          : undefined,
        suggestionsShort: Array.isArray(json.suggestionsShort)
          ? json.suggestionsShort.map(String).slice(0, 6)
          : undefined,
      };


      setAiResult(ai);

      const notes = [
        ...(ai.analysis ?? []),
        ...(ai.suggestions ?? []),
      ];

      navigation.navigate("ShareCard", {
        ai: {
          score: ai.score,
          vibe: ai.vibe,
          tags: ai.tags,
          notes,
          analysisShort: ai.analysisShort,
          suggestionsShort: ai.suggestionsShort,
        },
        imageUri: imageUri ?? null,
        imageBase64: imageBase64 ?? null,
      });

    } catch (err) {
      console.log("❌ Error in handleAnalyze:", err);
      Alert.alert(
        "AI error",
        "Something went wrong while talking to the stylist AI."
      );
    } finally {
      setIsAnalyzing(false);
      setShowAnalyzingOverlay(false);
    }
  };

  // 4) Save to wardrobe – optimistic UI + background sync
  const handleSaveToWardrobe = async () => {
    if (!aiResult) {
      Alert.alert(
        "No rating yet",
        "Analyze your outfit first so we can save it with a score."
      );
      return;
    }

    if (!imageUri && !imageBase64) {
      Alert.alert("No photo", "Add an outfit photo before saving.");
      return;
    }

    try {
      setIsSaving(true);

      const clientId =
        Math.random().toString(36).slice(2) + Date.now().toString(36);

      // Support both the old shape (aiResult.notes) and new split shape
      const anyResult: any = aiResult as any;
      const combinedNotes =
        Array.isArray(anyResult.analysis) ||
          Array.isArray(anyResult.suggestions)
          ? [
            ...(Array.isArray(anyResult.analysis)
              ? anyResult.analysis
              : []),
            ...(Array.isArray(anyResult.suggestions)
              ? anyResult.suggestions
              : []),
          ]
          : Array.isArray(anyResult.notes)
            ? anyResult.notes
            : [];

      // Optimistic local add
      // Optimistic local add
      addLook({
        id: clientId,
        imageUri: imageUri ?? null,
        score: aiResult.score ?? null,
        vibe: aiResult.vibe ?? null,
        tags: aiResult.tags ?? [],
        notes: combinedNotes,
        analysis: aiResult.analysis,
        suggestions: aiResult.suggestions,
        analysisShort: aiResult.analysisShort,
        suggestionsShort: aiResult.suggestionsShort,
        createdAt: Date.now(),
      });


      // Fire backend sync in the background
      syncLookToBackend(clientId, aiResult).catch((err: any) =>
        console.log("Background syncLookToBackend error:", err)
      );

      navigation.navigate("Wardrobe");
    } catch (err) {
      console.log("❌ Error in handleSaveToWardrobe:", err);
      Alert.alert(
        "Save failed",
        "We couldn't save this look right now. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 5) Manually open share card (optional, if user is back from that screen)
  const handleOpenShareCard = () => {
    if (!aiResult) {
      Alert.alert(
        "No rating yet",
        "Analyze your outfit first so we can build your share card."
      );
      return;
    }

    const anyResult: any = aiResult as any;
    const notes =
      Array.isArray(anyResult.analysis) || Array.isArray(anyResult.suggestions)
        ? [
          ...(Array.isArray(anyResult.analysis) ? anyResult.analysis : []),
          ...(Array.isArray(anyResult.suggestions)
            ? anyResult.suggestions
            : []),
        ]
        : Array.isArray(anyResult.notes)
          ? anyResult.notes
          : [];

    navigation.navigate("ShareCard", {
      ai: {
        score: aiResult.score ?? 0,
        vibe: aiResult.vibe ?? "Styled look",
        tags: aiResult.tags ?? [],
        notes,
        analysisShort: aiResult.analysisShort,
        suggestionsShort: aiResult.suggestionsShort,
      },
      imageUri: imageUri ?? null,
      imageBase64: imageBase64 ?? null,
    });

  };

  const handleReset = () => {
    setImageUri(null);
    setImageAspectRatio(null);
    setImageMimeType(null);
    setImageBase64(null);
    setAiResult(null);
  };

  // ─────────────────────── RENDER HELPERS ───────────────────────

  const renderDesktopLayout = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContentDesktop}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainRow}>
          {/* LEFT column */}
          <View style={styles.leftColumn}>
            <Text style={styles.sectionLabel}>1 · Outfit photo</Text>
            <Text style={styles.sectionTitle}>Add your outfit photo</Text>
            <Text style={styles.sectionBody}>
              Pick a photo from your device. Later, this will send the image to
              your AI stylist backend. For now, it uses a stock photo if you
              don’t pick anything.
            </Text>

            <View style={styles.outfitPlaceholder}>
              <Image
                style={styles.outfitImage}
                source={{ uri: imageUri ?? FALLBACK_IMAGE }}
                resizeMode="contain"
              />

              <View style={styles.outfitTextBlock}>
                <Text style={styles.outfitTitle}>
                  {imageUri ? "Selected outfit" : "Default outfit placeholder"}
                </Text>
                <Text style={styles.outfitBody}>
                  This is just a mock image for now. Once you wire your backend,
                  this will always show the photo the user just uploaded or
                  captured.
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.outlineButton, styles.buttonSpacing]}
                onPress={handlePickImage}
              >
                <Text style={styles.outlineButtonText}>
                  {imageUri ? "Change photo" : "Choose photo"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.buttonSpacing,
                  isAnalyzing && { opacity: 0.7 },
                ]}
                onPress={handleAnalyze}
                disabled={isAnalyzing}
              >
                <Text style={styles.primaryButtonText}>
                  {isAnalyzing ? "Analyzing outfit..." : "Analyze this outfit"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subtleButton, styles.buttonSpacing]}
                onPress={handleReset}
              >
                <Text style={styles.subtleButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hintBlock}>
              <Text style={styles.hintTitle}>
                What’s happening under the hood?
              </Text>
              <Text style={styles.hintBody}>
                When connected, the image will upload to storage, your AI
                service will analyze it, and the results will be stored with the
                look in your wardrobe.
              </Text>
            </View>
          </View>

          {/* RIGHT column: AI preview (kept for consistency) */}
          <View style={styles.rightColumn}>
            <Text style={styles.sectionLabel}>2 · AI rating</Text>
            <Text style={styles.sectionTitle}>AI feedback</Text>
            <Text style={styles.sectionBody}>
              This is how your AI stylist talks about your look. Ratings and
              tips are generated from your outfit photo.
            </Text>

            <View style={styles.aiCard}>
              {aiResult ? (
                <>
                  <View style={styles.aiHeaderRow}>
                    <View style={styles.scorePill}>
                      <Text style={styles.scoreValue}>
                        {aiResult.score.toFixed(1)}
                      </Text>
                      <Text style={styles.scoreSuffix}>/10</Text>
                    </View>
                    <View style={styles.aiHeaderText}>
                      <Text style={styles.aiTitle}>Nice fit ✨</Text>
                      <Text style={styles.aiSubtitle}>{aiResult.vibe}</Text>
                    </View>
                  </View>

                  {/* Analysis */}
                  {aiResult.analysis.length > 0 && (
                    <View style={styles.aiNotes}>
                      <Text style={styles.notesSectionTitle}>
                        What the stylist sees
                      </Text>
                      {aiResult.analysis.map((note, idx) => (
                        <View key={`a-${idx}`} style={styles.noteRow}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.noteText}>{note}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Suggestions */}
                  {aiResult.suggestions.length > 0 && (
                    <View style={[styles.aiNotes, { marginTop: 8 }]}>
                      <Text style={styles.notesSectionTitle}>
                        Stylist suggestions
                      </Text>
                      {aiResult.suggestions.map((note, idx) => (
                        <View key={`s-${idx}`} style={styles.noteRow}>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.noteText}>{note}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.tagRow}>
                    {aiResult.tags.map((tag, idx) => (
                      <View key={idx} style={styles.tagPill}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.bottomButtons}>
                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        styles.bottomButtonSpacing,
                        isSaving && { opacity: 0.7 },
                      ]}
                      onPress={handleSaveToWardrobe}
                      disabled={isSaving}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isSaving ? "Saving..." : "Save to wardrobe"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.outlineButton,
                        styles.bottomButtonSpacing,
                      ]}
                      onPress={handleOpenShareCard}
                    >
                      <Text style={styles.outlineButtonText}>
                        Open share card
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyAiState}>
                  <Text style={styles.emptyAiTitle}>No rating yet</Text>
                  <Text style={styles.emptyAiBody}>
                    Choose a photo and hit “Analyze this outfit” to see how your
                    AI stylist would talk about your look. You’ll be taken to a
                    dedicated share card screen once the rating is ready.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.bottomHint}>
              <Text style={styles.bottomHintTitle}>Next step</Text>
              <Text style={styles.bottomHintBody}>
                Every upload stores a “Look” in your wardrobe with image URL,
                score, tags, and notes. Share cards live in their own screen so
                they render at true 4:5 without being cut off.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderMobileLayout = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContentMobile}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: photo */}
        <View style={styles.mobileSection}>
          <Text style={styles.sectionLabel}>1 · Outfit photo</Text>
          <Text style={styles.sectionTitle}>Add your outfit photo</Text>
          <Text style={styles.sectionBody}>
            Pick a photo from your device. Later, this will send the image to
            your AI stylist backend. For now, it uses a stock photo if you don’t
            pick anything.
          </Text>

          <View style={styles.outfitPlaceholder}>
            <Image
              style={styles.outfitImage}
              source={{ uri: imageUri ?? FALLBACK_IMAGE }}
              resizeMode="contain"
            />

            <View style={styles.outfitTextBlock}>
              <Text style={styles.outfitTitle}>
                {imageUri ? "Selected outfit" : "Default outfit placeholder"}
              </Text>
              <Text style={styles.outfitBody}>
                This is just a mock image for now. Once you wire your backend,
                this will always show the photo the user just uploaded or
                captured.
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.outlineButton, styles.buttonSpacing]}
              onPress={handlePickImage}
            >
              <Text style={styles.outlineButtonText}>
                {imageUri ? "Change photo" : "Choose photo"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.buttonSpacing,
                isAnalyzing && { opacity: 0.7 },
              ]}
              onPress={handleAnalyze}
              disabled={isAnalyzing}
            >
              <Text style={styles.primaryButtonText}>
                {isAnalyzing ? "Analyzing outfit..." : "Analyze this outfit"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subtleButton, styles.buttonSpacing]}
              onPress={handleReset}
            >
              <Text style={styles.subtleButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hintBlock}>
            <Text style={styles.hintTitle}>
              What’s happening under the hood?
            </Text>
            <Text style={styles.hintBody}>
              When connected, the image will upload to storage, your AI service
              will analyze it, and the results will be stored with the look in
              your wardrobe.
            </Text>
          </View>
        </View>

        {/* Section 2: AI rating */}
        <View style={styles.mobileSection}>
          <Text style={styles.sectionLabel}>2 · AI rating</Text>
          <Text style={styles.sectionTitle}>AI feedback</Text>
          <Text style={styles.sectionBody}>
            This is how your AI stylist talks about your look. Ratings and tips
            are generated from your outfit photo.
          </Text>

          <View style={styles.aiCard}>
            {aiResult ? (
              <>
                <View style={styles.aiHeaderRow}>
                  <View style={styles.scorePill}>
                    <Text style={styles.scoreValue}>
                      {aiResult.score.toFixed(1)}
                    </Text>
                    <Text style={styles.scoreSuffix}>/10</Text>
                  </View>
                  <View style={styles.aiHeaderText}>
                    <Text style={styles.aiTitle}>Nice fit ✨</Text>
                    <Text style={styles.aiSubtitle}>{aiResult.vibe}</Text>
                  </View>
                </View>

                {/* Analysis */}
                {aiResult.analysis.length > 0 && (
                  <View style={styles.aiNotes}>
                    <Text style={styles.notesSectionTitle}>
                      What the stylist sees
                    </Text>
                    {aiResult.analysis.map((note, idx) => (
                      <View key={`a-m-${idx}`} style={styles.noteRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.noteText}>{note}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Suggestions */}
                {aiResult.suggestions.length > 0 && (
                  <View style={[styles.aiNotes, { marginTop: 8 }]}>
                    <Text style={styles.notesSectionTitle}>
                      Stylist suggestions
                    </Text>
                    {aiResult.suggestions.map((note, idx) => (
                      <View key={`s-m-${idx}`} style={styles.noteRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.noteText}>{note}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.tagRow}>
                  {aiResult.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.bottomButtons}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      styles.bottomButtonSpacing,
                      isSaving && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveToWardrobe}
                    disabled={isSaving}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isSaving ? "Saving..." : "Save to wardrobe"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.outlineButton,
                      styles.bottomButtonSpacing,
                    ]}
                    onPress={handleOpenShareCard}
                  >
                    <Text style={styles.outlineButtonText}>
                      Open share card
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyAiState}>
                <Text style={styles.emptyAiTitle}>No rating yet</Text>
                <Text style={styles.emptyAiBody}>
                  Choose a photo and hit “Analyze this outfit” to see your
                  stylist’s notes. Once ready, you’ll be taken to a dedicated
                  share card screen where you can save and export.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomHint}>
            <Text style={styles.bottomHintTitle}>Next step</Text>
            <Text style={styles.bottomHintBody}>
              Every upload stores a “Look” in your wardrobe with image URL,
              score, tags, and notes. Share cards now live on their own screen,
              so they render at true 4:5 without being cut off.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      {/* soft color blobs */}
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
          <Text style={styles.betaTag}>Prototype · AI powered</Text>
        </View>
      </View>

      {isWeb ? renderDesktopLayout() : renderMobileLayout()}

      {showAnalyzingOverlay && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <Animated.View
              style={[
                styles.analyzingIconWrapper,
                { transform: [{ rotate: spin }] },
              ]}
            >
              <Text style={styles.analyzingIcon}>👗</Text>
            </Animated.View>

            <Text style={styles.analyzingTitle}>Analyzing your look</Text>
            <Text style={styles.analyzingSubtitle}>
              Your AI stylist is rating your outfit, checking colors, fit, and
              the overall vibe of the look…
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export const UploadOutfitScreen = memo(UploadOutfitScreenInner);
export default UploadOutfitScreenInner;

// ─────────────────────── STYLES ───────────────────────

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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  topRight: {},
  betaTag: {
    fontSize: 11,
    color: "#A5B4FC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.6)",
    backgroundColor: "rgba(79,70,229,0.15)",
  },

  scrollContentDesktop: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 24,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 12,
  },

  scrollContentMobile: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 56,
  },
  mobileSection: {
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.08,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    marginBottom: 12,
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
    height: 320,
    borderRadius: 16,
    backgroundColor: "#020617",
    marginBottom: 10,
  },
  outfitTextBlock: {
    paddingHorizontal: 4,
  },
  outfitTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  outfitBody: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 17,
  },

  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  buttonSpacing: {
    marginRight: 8,
    marginBottom: 8,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "transparent",
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#E5E7EB",
  },
  subtleButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  subtleButtonText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  hintBlock: {
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.9)",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  hintBody: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
  },

  aiCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    padding: 14,
    backgroundColor: "rgba(15,23,42,0.96)",
    marginTop: 4,
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scorePill: {
    width: 70,
    height: 70,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(22,163,74,0.2)",
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#BBF7D0",
  },
  scoreSuffix: {
    fontSize: 10,
    color: "#6EE7B7",
  },
  aiHeaderText: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  aiNotes: {
    marginTop: 6,
    marginBottom: 4,
  },
  notesSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  bullet: {
    fontSize: 12,
    color: "#4F46E5",
    marginRight: 4,
    marginTop: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#E5E7EB",
    lineHeight: 17,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(79,70,229,0.18)",
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    color: "#C7D2FE",
  },

  bottomButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  bottomButtonSpacing: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyAiState: {
    paddingVertical: 16,
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
    lineHeight: 17,
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

  analyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    zIndex: 50,
  },
  analyzingCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    alignItems: "center",
  },
  analyzingIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(129,140,248,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  analyzingIcon: {
    fontSize: 34,
  },
  analyzingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  analyzingSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
});
