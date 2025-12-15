// app/TodaysOutfitBuilderScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { API_BASE_URL } from "../config/api";
import { auth } from "../services/firebase";
import { uploadImageToS3 } from "../services/uploadImage";


const MAX_ITEMS_PER_CATEGORY = 3;

type CategoryId = "tops" | "bottoms" | "footwear" | "accessories";

type WardrobeImage = {
  id: string;
  localUri: string;
  s3Url?: string;
  mimeType: string;
  uploading: boolean;
  error?: string;
};

type CategoryState = {
  [key in CategoryId]: WardrobeImage[];
};

const CATEGORY_META: { id: CategoryId; label: string; emoji: string }[] = [
  { id: "tops", label: "Tops / Shirts", emoji: "👕" },
  { id: "bottoms", label: "Bottoms / Pants", emoji: "👖" },
  { id: "footwear", label: "Footwear", emoji: "👟" },
  { id: "accessories", label: "Accessories", emoji: "💍" },
];

const TodaysOutfitBuilderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { occasionId, occasionLabel, styleProfile } = route.params ?? {};

  const [categories, setCategories] = useState<CategoryState>({
    tops: [],
    bottoms: [],
    footwear: [],
    accessories: [],
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalyzingOverlay, setShowAnalyzingOverlay] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;
  useMemo(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const totalSelected = useMemo(
    () =>
      categories.tops.length +
      categories.bottoms.length +
      categories.footwear.length +
      categories.accessories.length,
    [categories]
  );

  const canGenerate = useMemo(() => {
    // basic rule: at least 1 top, 1 bottom, 1 footwear
    return (
      categories.tops.length > 0 &&
      categories.bottoms.length > 0 &&
      categories.footwear.length > 0 &&
      !isAnalyzing
    );
  }, [categories, isAnalyzing]);

  // ─────────────────────── image helpers ───────────────────────

  const pickImageForCategory = async (categoryId: CategoryId) => {
    const current = categories[categoryId];
    if (current.length >= MAX_ITEMS_PER_CATEGORY) return;

    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need access to your photos to add wardrobe items."
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
    let finalUri = asset.uri ?? "";
    let finalBase64: string | null = asset.base64 ?? null;
    let finalMimeType: string = (asset as any).mimeType || "image/jpeg";

    if (!finalUri) {
      Alert.alert("Error", "We couldn't read that image. Try again.");
      return;
    }

    // compress on native
    if (Platform.OS !== "web" && asset.uri) {
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
        finalBase64 = manipulated.base64 ?? finalBase64;
        finalMimeType = "image/jpeg";
      } catch (err) {
        console.log("⚠️ Compression failed, using original image", err);
      }
    }

    const id =
      categoryId +
      "_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);

    const newImage: WardrobeImage = {
      id,
      localUri: finalUri,
      mimeType: finalMimeType,
      uploading: true,
    };

    setCategories((prev) => ({
      ...prev,
      [categoryId]: [...prev[categoryId], newImage],
    }));

    try {
      const s3Url = await uploadToS3(finalBase64, finalMimeType, finalUri);
      if (!s3Url) {
        throw new Error("No S3 URL returned");
      }

      setCategories((prev) => ({
        ...prev,
        [categoryId]: prev[categoryId].map((img) =>
          img.id === id
            ? { ...img, s3Url, uploading: false, error: undefined }
            : img
        ),
      }));
    } catch (err: any) {
      console.log("❌ Upload to S3 failed:", err);
      setCategories((prev) => ({
        ...prev,
        [categoryId]: prev[categoryId].map((img) =>
          img.id === id
            ? {
                ...img,
                uploading: false,
                error: "Upload failed",
              }
            : img
        ),
      }));
      Alert.alert(
        "Upload failed",
        "We couldn't upload this item to your wardrobe storage."
      );
    }
  };

   const uploadToS3 = async (
    base64: string | null,
    mimeType: string,
    uri: string
  ): Promise<string | null> => {
    try {
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      if (Platform.OS === "web") {
        if (!base64) {
          console.log("Today’s Outfit Builder (web): missing base64.");
          return null;
        }

        console.log(
          "▶ Today’s Outfit Builder (web) upload via shared uploadImageToS3"
        );

        const url = await uploadImageToS3({
          base64, // same as before: plain base64 (no data URL)
          mimeType,
          token,
        });

        if (!url) {
          console.log("❌ Today’s Outfit Builder (web): uploadImageToS3 failed");
          return null;
        }

        console.log("✅ Today’s Outfit Builder (web): got URL", url);
        return url;
      }

      // NATIVE path: mirror UploadOutfitScreen behavior via helper
      if (!uri) {
        console.log("Today’s Outfit Builder (native): missing uri.");
        return null;
      }

      console.log(
        "▶ Today’s Outfit Builder (native) upload via shared uploadImageToS3…"
      );

      const nativeUrl = await uploadImageToS3({
        uri,
        mimeType,
        token,
      });

      if (!nativeUrl) {
        console.log("❌ Today’s Outfit Builder (native): uploadImageToS3 failed");
        return null;
      }

      console.log(
        "✅ Today’s Outfit Builder (native): got URL from helper",
        nativeUrl
      );
      return nativeUrl;
    } catch (err) {
      console.log("❌ uploadToS3 generic error (Today’s Outfit Builder):", err);
      return null;
    }
  };


  const removeImage = (categoryId: CategoryId, imageId: string) => {
    setCategories((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId].filter((img) => img.id !== imageId),
    }));
  };

  // ─────────────────────── AI call ───────────────────────

 const handleGenerateOutfit = async () => {
    if (!occasionId) {
      Alert.alert("Missing occasion", "Go back and pick where you're going.");
      return;
    }

    // Ensure every selected item has an S3 URL
    const tops = categories.tops
      .filter((img) => img.s3Url)
      .map((img) => img.s3Url as string);
    const bottoms = categories.bottoms
      .filter((img) => img.s3Url)
      .map((img) => img.s3Url as string);
    const footwear = categories.footwear
      .filter((img) => img.s3Url)
      .map((img) => img.s3Url as string);
    const accessories = categories.accessories
      .filter((img) => img.s3Url)
      .map((img) => img.s3Url as string);

    if (!tops.length || !bottoms.length || !footwear.length) {
      Alert.alert(
        "Add more pieces",
        "Pick at least one top, one bottom and one pair of shoes."
      );
      return;
    }

    try {
      setIsAnalyzing(true);
      setShowAnalyzingOverlay(true);

      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      const res = await fetch(`${API_BASE_URL}/ai/todays-outfit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          occasionId,
          occasionLabel,
          items: {
            tops,
            bottoms,
            footwear,
            accessories,
          },
          // send the saved profile so backend can personalize
          styleProfileOverride: styleProfile ?? null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.log("❌ todays-outfit failed:", res.status, text);
        Alert.alert(
          "AI error",
          "We couldn't build a full outfit right now. Try again shortly."
        );
        return;
      }

      const json = await res.json();

      navigation.navigate("TodaysOutfitResult", {
        occasionId,
        occasionLabel,
        result: json,
      });
    } catch (err) {
      console.log("❌ Error in handleGenerateOutfit:", err);
      Alert.alert(
        "AI error",
        "Something went wrong while talking to the stylist AI."
      );
    } finally {
      setIsAnalyzing(false);
      setShowAnalyzingOverlay(false);
    }
  };

  // ─────────────────────── render ───────────────────────

  const renderCategory = (meta: (typeof CATEGORY_META)[number]) => {
    const items = categories[meta.id];
    const isFull = items.length >= MAX_ITEMS_PER_CATEGORY;

    return (
      <View key={meta.id} style={styles.categoryBlock}>
        <View style={styles.categoryHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
            <View>
              <Text style={styles.categoryTitle}>{meta.label}</Text>
              <Text style={styles.categorySubtitle}>
                {items.length}/{MAX_ITEMS_PER_CATEGORY} selected
              </Text>
            </View>
          </View>

          {isFull ? (
            <View style={styles.chipFull}>
              <Text style={styles.chipFullText}>Max items reached</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.chipAdd}
              onPress={() => pickImageForCategory(meta.id)}
            >
              <Text style={styles.chipAddText}>+ Add item</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.itemsRow}>
          {items.map((img) => (
            <View key={img.id} style={styles.itemCard}>
              <Image
                source={{ uri: img.localUri }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => removeImage(meta.id, img.id)}
              >
                <Text style={styles.removeBadgeText}>×</Text>
              </TouchableOpacity>

              <View style={styles.itemFooter}>
                {img.uploading ? (
                  <View style={styles.itemStatusRow}>
                    <ActivityIndicator size="small" />
                    <Text style={styles.itemStatusText}>Uploading…</Text>
                  </View>
                ) : img.error ? (
                  <Text style={styles.itemErrorText}>{img.error}</Text>
                ) : (
                  <Text style={styles.itemOkText}>Ready</Text>
                )}
              </View>
            </View>
          ))}

          {/* “Add” tile at the end when not full */}
          {!isFull && (
            <TouchableOpacity
              style={[styles.itemCard, styles.itemAddCard]}
              onPress={() => pickImageForCategory(meta.id)}
            >
              <Text style={styles.itemAddPlus}>＋</Text>
              <Text style={styles.itemAddLabel}>Add {meta.label}</Text>
              <Text style={styles.itemAddHint}>Up to {MAX_ITEMS_PER_CATEGORY}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Build today&apos;s outfit</Text>
        </View>

        <View style={styles.topRight}>
          <Text style={styles.betaTag}>
            {occasionLabel ? occasionLabel : "Pick your best pieces"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>STEP 2 · WARDROBE ITEMS</Text>
          <Text style={styles.heading}>
            Drop in a few options from each category
          </Text>
          <Text style={styles.subheading}>
            Max 3 per row. Once a category hits 3, the add button locks so the
            screen stays clean and focused.
          </Text>
        </View>

        {CATEGORY_META.map(renderCategory)}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>How it works</Text>
          <Text style={styles.summaryBody}>
            We&apos;ll look at your saved style profile, today&apos;s occasion
            and these wardrobe items. Then we&apos;ll suggest a top + bottom
            + footwear combo and how to style it with accessories.
          </Text>
          <Text style={styles.summaryMeta}>
            Items selected: {totalSelected}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canGenerate && { opacity: 0.4 },
          ]}
          disabled={!canGenerate}
          onPress={handleGenerateOutfit}
        >
          <Text style={styles.primaryButtonText}>
            {isAnalyzing ? "Planning your outfit…" : "Ask stylist for an outfit"}
          </Text>
        </TouchableOpacity>
      </View>

      {showAnalyzingOverlay && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <Animated.View
              style={[
                styles.analyzingIconWrapper,
                { transform: [{ rotate: spin }] },
              ]}
            >
              <Text style={styles.analyzingIcon}>🧵</Text>
            </Animated.View>
            <Text style={styles.analyzingTitle}>Planning your outfit</Text>
            <Text style={styles.analyzingSubtitle}>
              Your AI stylist is mixing tops, bottoms, shoes and accessories
              based on your body profile and today&apos;s occasion…
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TodaysOutfitBuilderScreen;

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
    alignItems: "center",
    justifyContent: "space-between",
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
  topRight: {},
  betaTag: {
    fontSize: 11,
    color: "#4B5563",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerBlock: {
    marginTop: 16,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  categoryBlock: {
    marginBottom: 18,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  categoryHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  addButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },

  itemsRow: {
    flexDirection: "row",
    gap: 10,
  },
  itemSlot: {
    width: 80,
    height: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemSlotEmptyText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  itemImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },

  summaryCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  summaryMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  primaryButton: {
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

  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingCard: {
    width: "80%",
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  analyzingIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  analyzingIcon: {
    fontSize: 26,
  },
  analyzingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  analyzingSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  categorySubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  chipAdd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.7)",
    backgroundColor: "rgba(30,64,175,0.4)",
  },
  chipAddText: {
    fontSize: 11,
    color: "#E5E7EB",
    fontWeight: "500",
  },
  chipFull: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    backgroundColor: "rgba(30,64,175,0.15)",
  },
  chipFullText: {
    fontSize: 11,
    color: "#CBD5F5",
  },
  itemCard: {
    width: "30%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    marginRight: "3.3%",
    marginBottom: 10,
    overflow: "hidden",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.9)",
  },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  removeBadgeText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
  },
  itemFooter: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,41,55,0.9)",
    backgroundColor: "rgba(15,23,42,0.94)",
  },
  itemStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemStatusText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  itemErrorText: {
    fontSize: 10,
    color: "#FCA5A5",
  },
  itemOkText: {
    fontSize: 10,
    color: "#A5B4FC",
  },
  itemAddCard: {
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderColor: "rgba(148,163,184,0.9)",
    backgroundColor: "rgba(15,23,42,0.8)",
  },
  itemAddPlus: {
    fontSize: 24,
    color: "#E5E7EB",
    marginBottom: 4,
  },
  itemAddLabel: {
    fontSize: 11,
    color: "#E5E7EB",
    fontWeight: "500",
  },
  itemAddHint: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 2,
  },

});
