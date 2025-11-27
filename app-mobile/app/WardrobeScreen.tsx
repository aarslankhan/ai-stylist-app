// app-mobile/app/WardrobeScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLooks } from "../context/LooksContext";

export default function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const { looks, clearLooks, deleteLook } = useLooks();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCardPress = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (selectedId === id) {
        setSelectedId(null);
      }
      deleteLook(id);
      return;
    }

    Alert.alert("Delete outfit", "Remove this outfit from your wardrobe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (selectedId === id) {
            setSelectedId(null);
          }
          deleteLook(id);
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      {/* background blobs */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <Text style={styles.backText}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Wardrobe</Text>
        </View>

        <View style={styles.topRight}>
          {looks.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearLooks}>
              <Text style={styles.clearButtonText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          <Text style={styles.headerEyebrow}>WARDROBE</Text>
          <Text style={styles.headerTitle}>Your saved outfits</Text>
          <Text style={styles.headerSubtitle}>
            Every time you tap “Save to wardrobe”, your look lands here with its
            AI breakdown.
          </Text>

          {looks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No looks saved yet</Text>
              <Text style={styles.emptyBody}>
                Upload an outfit, analyze it, and tap “Save to wardrobe” to see
                it here.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate("UploadOutfit")}
              >
                <Text style={styles.primaryButtonText}>
                  Upload your first outfit
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {looks.map((look, index) => {
                const isSelected = selectedId === look.id;

                return (
                  <View
                    key={look.id}
                    style={[
                      styles.card,
                      // small right margin on left column to create gap
                      (index % 2 === 0) && styles.cardLeft,
                      isSelected && styles.cardSelected,
                    ]}
                  >
                    {/* Top clickable area ONLY */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleCardPress(look.id)}
                      style={{ width: "100%" }}
                    >
                      {/* Hanger bar */}
                      <View style={styles.cardHeader}>
                        <View style={styles.hangerBar} />
                        <View style={styles.hangerDot} />
                      </View>

                      {/* Image */}
                      <View style={styles.imageWrapper}>
                        {look.imageUri ? (
                          <Image
                            source={{ uri: look.imageUri }}
                            style={styles.image}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <Text style={styles.imagePlaceholderText}>
                              No image
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Title + score */}
                      <View style={styles.cardBody}>
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {look.vibe ?? "Saved look"}
                          </Text>
                          <View style={styles.scoreChip}>
                            <Text style={styles.scoreChipText}>
                              {look.score != null
                                ? `${look.score.toFixed(1)}/10`
                                : "—/10"}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.cardMeta}>
                          {new Date(look.createdAt).toLocaleString()}
                        </Text>

                        {/* Tags */}
                        {look.tags && look.tags.length > 0 && (
                          <View style={styles.tagsRow}>
                            {look.tags.map((t, i) => (
                              <View key={i} style={styles.tagPill}>
                                <Text style={styles.tagText}>{t}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Expandable analysis */}
                        {isSelected && (
                          <>
                            <View style={styles.analysisBox}>
                              <Text style={styles.analysisTitle}>
                                AI breakdown
                              </Text>

                              {look.notes && look.notes.length > 0 ? (
                                look.notes.map((n, i) => (
                                  <View key={i} style={styles.noteRow}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={styles.noteText}>{n}</Text>
                                  </View>
                                ))
                              ) : (
                                <Text style={styles.noteText}>
                                  No detailed notes saved for this look.
                                </Text>
                              )}

                              {look.tags && look.tags.length > 0 && (
                                <View style={styles.analysisTagsRow}>
                                  {look.tags.map((tag, idx) => (
                                    <View
                                      key={idx}
                                      style={styles.analysisTagPill}
                                    >
                                      <Text style={styles.analysisTagText}>
                                        {tag}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>

                            <TouchableOpacity
                              style={styles.detailLink}
                              onPress={() =>
                                navigation.navigate("LookDetail", {
                                  id: look.id,
                                })
                              }
                            >
                              <Text style={styles.detailLinkText}>
                                View full entry →
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}

                        <Text style={styles.cardHint}>
                          Tap to {isSelected ? "hide" : "see"} analysis
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* NON-clickable delete area */}
                    <View style={styles.cardBottomRow}>
                      <TouchableOpacity onPress={() => handleDelete(look.id)}>
                        <Text style={styles.deleteText}>Delete outfit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 32 }} />
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
  clearButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearButtonText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  contentInner: {
    paddingBottom: 16,
  },
  headerEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#6B7280",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "rgba(15,23,42,0.96)",
    padding: 18,
    alignItems: "flex-start",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 10,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  card: {
    width: "48%", // 🔑 two cards side by side
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "#111827",
    marginBottom: 12,
    overflow: "hidden",
  },
  cardLeft: {
    marginRight: "4%", // gap between two columns
  },
  cardSelected: {
    borderColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: "center",
  },
  hangerBar: {
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#1F2937",
  },
  hangerDot: {
    marginTop: 4,
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#020617",
  },
  imageWrapper: {
    width: "100%",
    backgroundColor: "#020617",
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    maxHeight: 220, // 🔑 smaller card image like a feed tile
    borderRadius: 16,
    backgroundColor: "#020617",
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    maxHeight: 220,
    borderRadius: 16,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    flex: 1,
    marginRight: 8,
  },
  scoreChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.6)",
  },
  scoreChipText: {
    fontSize: 11,
    color: "#BBF7D0",
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(55,65,81,0.95)",
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: "#E5E7EB",
  },
  analysisBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "rgba(15,23,42,0.98)",
    padding: 10,
  },
  analysisTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  noteRow: {
    flexDirection: "row",
    marginBottom: 3,
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
  analysisTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  analysisTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.12)",
    marginRight: 6,
    marginBottom: 4,
  },
  analysisTagText: {
    fontSize: 11,
    color: "#BFDBFE",
  },
  cardHint: {
    marginTop: 6,
    fontSize: 10,
    color: "#6B7280",
  },
  detailLink: {
    marginTop: 8,
  },
  detailLinkText: {
    fontSize: 11,
    color: "#A5B4FC",
    fontWeight: "500",
  },
  cardBottomRow: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  deleteText: {
    fontSize: 11,
    color: "#FCA5A5",
  },
});
