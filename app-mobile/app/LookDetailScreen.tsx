// app-mobile/app/LookDetailScreen.tsx
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
import {
  useNavigation,
  useRoute,
  RouteProp,
} from "@react-navigation/native";

import { useLooks, type Look } from "../context/LooksContext";
import type { RootStackParamList } from "../App";
import { SafeAreaView } from "react-native-safe-area-context";


type LookDetailRoute = RouteProp<RootStackParamList, "LookDetail">;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

const LookDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<LookDetailRoute>();
  const { looks, deleteLook } = useLooks();

  const { id } = route.params;
  const look = looks.find((l) => l.id === id) as Look | undefined;

  if (!look) {
    return (
      <View style={styles.page}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>
            This look could not be found in your wardrobe.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Wardrobe")}
          >
            <Text style={styles.primaryButtonText}>Back to wardrobe</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const createdAt =
    typeof look.createdAt === "number"
      ? new Date(look.createdAt)
      : new Date();
  const createdLabel = `${createdAt.toLocaleDateString()} · ${createdAt.toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit" }
  )}`;

  // ───────────── Derive analysis + suggestions ─────────────
  const anyLook: any = look;

  let analysisLines: string[] = [];
  let suggestionLines: string[] = [];

  if (
    Array.isArray(anyLook.analysis) &&
    (anyLook.analysis as string[]).length > 0
  ) {
    // New shape: explicit analysis + suggestions
    analysisLines = anyLook.analysis;
    suggestionLines = Array.isArray(anyLook.suggestions)
      ? anyLook.suggestions
      : [];
  } else if (Array.isArray(look.notes) && look.notes.length > 0) {
    // Legacy shape: only "notes" → split into analysis + suggestions
    const notes = look.notes;
    const splitIndex = Math.ceil(notes.length / 2); // first half = analysis, second half = suggestions
    analysisLines = notes.slice(0, splitIndex);
    suggestionLines = notes.slice(splitIndex);
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete this look?",
      "This will remove the look and its AI notes from your wardrobe.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLook(look.id);
            navigation.navigate("Wardrobe");
          },
        },
      ]
    );
  };

  const handleOpenShareCard = () => {
    navigation.navigate("ShareCard", { id: look.id });
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      {/* background blobs */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Wardrobe")}>
          <Text style={styles.backText}>← Wardrobe</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Look details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* hero image – full image, not cropped */}
        <View style={styles.heroCard}>
          <Image
            source={{ uri: look.imageUri || FALLBACK_IMAGE }}
            style={styles.heroImage}
            resizeMode="contain"
          />
          {typeof look.score === "number" && (
            <View style={styles.heroScorePill}>
              <Text style={styles.heroScoreValue}>
                {look.score.toFixed(1)}
              </Text>
              <Text style={styles.heroScoreSuffix}>/10</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Saved on</Text>
              <Text style={styles.summaryValue}>{createdLabel}</Text>
            </View>
          </View>

          {!!look.vibe && (
            <View style={[styles.summaryBlock, { marginTop: 10 }]}>
              <Text style={styles.summaryLabel}>AI vibe</Text>
              <Text style={styles.summaryValue}>{look.vibe}</Text>
            </View>
          )}
        </View>

        {/* AI rating */}
        {typeof look.score === "number" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>AI rating</Text>
            <View style={styles.ratingRow}>
              <View style={styles.scorePill}>
                <Text style={styles.scoreValue}>
                  {look.score.toFixed(1)}
                </Text>
                <Text style={styles.scoreSuffix}>/10</Text>
              </View>
              <View style={styles.ratingText}>
                <Text style={styles.ratingTitle}>
                  {look.vibe || "AI style rating"}
                </Text>
                <Text style={styles.ratingSubtitle}>
                  Style rating generated when you saved this look.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Aura's Analysis */}
        {analysisLines.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Aura’s Analysis</Text>
            {analysisLines.map((note, idx) => (
              <View key={`a-${idx}`} style={styles.noteRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Aura's Suggestions */}
        {suggestionLines.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Aura’s Suggestions</Text>
            {suggestionLines.map((note, idx) => (
              <View key={`s-${idx}`} style={styles.noteRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tags */}
        {Array.isArray(look.tags) && look.tags.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagRow}>
              {look.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* bottom button strip */}
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.footerButton, styles.footerSecondary]}
            onPress={() => navigation.navigate("Wardrobe")}
          >
            <Text style={styles.footerSecondaryText}>Back to wardrobe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.footerPrimary]}
            onPress={handleOpenShareCard}
          >
            <Text style={styles.footerPrimaryText}>Open share card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.footerDanger]}
            onPress={handleDelete}
          >
            <Text style={styles.footerDangerText}>Delete this look</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LookDetailScreen;

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
    backgroundColor: "rgba(191,219,254,0.6)",
    opacity: 0.7,
  },
  bgBlobPink: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(254,202,232,0.6)",
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
  backText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },
  heroImage: {
    width: "100%",
    height: 320,
  },
  heroScorePill: {
    position: "absolute",
    right: 16,
    bottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.9)",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  heroScoreValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ECFDF5",
  },
  heroScoreSuffix: {
    fontSize: 11,
    color: "#DCFAE6",
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryBlock: {
    marginRight: 14,
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  summaryValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  scorePill: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(22,163,74,0.2)",
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#BBF7D0",
  },
  scoreSuffix: {
    fontSize: 10,
    color: "#6EE7B7",
  },
  ratingText: {
    flex: 1,
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 2,
  },
  ratingSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
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
    color: "#374151",
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
  footerButtons: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    marginLeft: 8,
    marginBottom: 8,
  },
  footerSecondary: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
footerSecondaryText: {
  fontSize: 13,
  color: "#111827",
  fontWeight: "500",
},
  footerPrimary: {
    backgroundColor: "#4F46E5",
  },
  footerPrimaryText: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  footerDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.8)",
  },
  footerDangerText: {
    fontSize: 13,
    color: "#FCA5A5",
    fontWeight: "600",
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
  primaryButton: {
    backgroundColor: "#6366F1",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "600",
  },
});
