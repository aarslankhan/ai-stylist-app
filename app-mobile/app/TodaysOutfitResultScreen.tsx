// app/TodaysOutfitResultScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../App";
import { API_BASE_URL } from "@/config/api";
import { auth } from "@/services/firebase";

type ResultNav = NativeStackNavigationProp<
  RootStackParamList,
  "TodaysOutfitResult"
>;
type Nav = NativeStackNavigationProp<RootStackParamList, "TodaysOutfitResult">;
type Route = RouteProp<RootStackParamList, "TodaysOutfitResult">;

const TodaysOutfitResultScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const { occasionId, occasionLabel, result } = route.params ?? {};

  // Make this robust to different backend shapes
  const chosen = result?.chosenOutfit ?? {};
  const explanation: string =
    result?.explanation ??
    result?.summary ??
    "Your stylist built this outfit using your style profile and the pieces you added.";

  const tips: string[] = result?.tips ?? [];
  const alternate = result?.alternate ?? null;

  const handleTryAnother = () => {
navigation.replace("TodaysOutfitOccasion");
  };

  const handleSaveOutfit = () => {
    // For now just UX; you can later tie this to /api/wardrobe or /api/looks
    Alert.alert(
      "Save outfit",
      "We can hook this into your wardrobe soon so you can save generated outfits as looks.",
      [
        {
          text: "OK",
          style: "default",
        },
      ]
    );
  };

  const handleBackToOccasion = () => {
    navigation.navigate("TodaysOutfitOccasion");
  };

  const renderItem = (label: string, imageUrl?: string, fallbackEmoji = "👕") => {
    if (!imageUrl) {
      return (
        <View style={styles.itemCard}>
          <View style={styles.itemPlaceholder}>
            <Text style={styles.itemEmoji}>{fallbackEmoji}</Text>
            <Text style={styles.itemPlaceholderLabel}>{label}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.itemCard}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemLabelBar}>
          <Text style={styles.itemLabelText}>{label}</Text>
        </View>
      </View>
    );
  };

  const renderBulletList = (items?: string[]) => {
    if (!items || !items.length) return null;
    return (
      <>
        {items.map((item, idx) => (
          <View style={styles.bulletRow} key={`${idx}-${item.slice(0, 10)}`}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </>
    );
  };
  // helper to convert base64 → blob reliably
const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
};

const uploadToS3 = async (
  base64: string | null,
  mimeType: string,
  uri: string
): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;

    // WEB flow stays unchanged...

    // NATIVE flow:
    const presignRes = await fetch(`${API_BASE_URL}/upload-image/presign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ mimeType: mimeType || "image/jpeg" }),
    });

    if (!presignRes.ok) {
      console.log("❌ Native presign failed:", presignRes.status);
      return null;
    }

    const { uploadUrl, fileUrl } = await presignRes.json();
    if (!uploadUrl || !fileUrl) return null;

    // ⭐ FIX → Create Blob from base64 (no more fetch(uri))
    if (!base64) {
      console.log("❌ Missing base64 for native upload");
      return null;
    }

    const blob = base64ToBlob(base64, mimeType);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType || "image/jpeg",
      },
      body: blob,
    });

    if (!putRes.ok) {
      console.log("❌ PUT failed:", putRes.status);
      return null;
    }

    return fileUrl;
  } catch (err) {
    console.log("❌ uploadToS3 generic error:", err);
    return null;
  }
};


  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobTeal} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity onPress={handleBackToOccasion}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Today&apos;s outfit</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.occasionTag}>
            {occasionLabel || "Your occasion"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Recommended combo</Text>
          <Text style={styles.heroTitle}>Your stylist picked this for you</Text>
          <Text style={styles.heroBody}>{explanation}</Text>
        </View>

        {/* Outfit grid */}
        <View style={styles.outfitRow}>
          {renderItem(
            chosen.topLabel || "Top",
            chosen.topImage || chosen.top,
            "👕"
          )}
          {renderItem(
            chosen.bottomLabel || "Bottom",
            chosen.bottomImage || chosen.bottom,
            "👖"
          )}
          {renderItem(
            chosen.footwearLabel || "Shoes",
            chosen.footwearImage || chosen.footwear,
            "👟"
          )}
        </View>

        {/* Accessories */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Accessories</Text>
          {chosen.accessoryImages?.length ? (
            <View style={styles.accessoryRow}>
              {chosen.accessoryImages.slice(0, 4).map((url: string, idx: number) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.accessoryImage}
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : chosen.accessories?.length ? (
            renderBulletList(chosen.accessories)
          ) : (
            <Text style={styles.emptyText}>
              AI will suggest watches, rings or simple accessories based on your
              profile.
            </Text>
          )}
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Styling tips</Text>
          {renderBulletList(tips) || (
            <Text style={styles.emptyText}>
              Ask again with more pieces to get deeper styling tips.
            </Text>
          )}
        </View>

        {/* Alternate look */}
        {alternate && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Alternate vibe</Text>
            <Text style={styles.altBody}>
              Try this as a backup outfit for a slightly different mood.
            </Text>
            {renderBulletList(alternate?.highlights ?? [])}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSaveOutfit}
          >
            <Text style={styles.primaryButtonText}>Save outfit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={handleTryAnother}
          >
            <Text style={styles.outlineButtonText}>Try another combo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TodaysOutfitResultScreen;

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
  },
  bgBlobTeal: {
    position: "absolute",
    bottom: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(45,212,191,0.30)",
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
    gap: 8,
  },
  topRight: {},
  backText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  occasionTag: {
    fontSize: 11,
    color: "#A5B4FC",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.5)",
    backgroundColor: "rgba(15,23,42,0.98)",
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 11,
    color: "#A5B4FC",
    textTransform: "uppercase",
    letterSpacing: 0.08,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  heroBody: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
  },
  outfitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  itemCard: {
    width: "31%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.9)",
    backgroundColor: "rgba(15,23,42,0.96)",
  },
  itemImage: {
    width: "100%",
    height: 110,
  },
  itemLabelBar: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,41,55,0.9)",
  },
  itemLabelText: {
    fontSize: 11,
    color: "#E5E7EB",
  },
  itemPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  itemEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  itemPlaceholderLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "rgba(15,23,42,0.98)",
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
  },
  accessoryRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  accessoryImage: {
    width: 40,
    height: 40,
    borderRadius: 999,
    marginRight: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4B5563",
    marginTop: 6,
    marginRight: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: "#D1D5DB",
  },
  altBody: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  outlineButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  outlineButtonText: {
    fontSize: 13,
    color: "#E5E7EB",
  },
});
