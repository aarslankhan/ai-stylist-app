// app-mobile/app/WardrobeScreen.tsx
import React, { useState, useEffect } from "react";
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
import { useLooks, type Look } from "../context/LooksContext";
import { SafeAreaView } from "react-native-safe-area-context";


const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

const ITEMS_PER_PAGE = 6;
const MAX_LOOKS = 60; // soft cap (just for the message)

// ──────────────────────────────────────────────

export default function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const { looks, deleteLook } = useLooks();

  const [page, setPage] = useState(0);

  const totalPages =
    looks.length === 0 ? 1 : Math.ceil(looks.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(0);
    }
  }, [looks.length, page, totalPages]);

  const hasLooks = looks.length > 0;

  const pageLooks = hasLooks
    ? looks
        .slice()
        .sort((a, b) => {
          const aCreated =
            typeof a.createdAt === "number" ? a.createdAt : 0;
          const bCreated =
            typeof b.createdAt === "number" ? b.createdAt : 0;
          return bCreated - aCreated;
        })
        .slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)
    : [];

  const handleBackHome = () => {
    navigation.navigate("Home");
  };

  const handleOpenDetail = (look: Look) => {
    navigation.navigate("LookDetail", { id: look.id });
  };

  const handleShareCard = (look: Look) => {
    if (!look.imageUri) {
      Alert.alert(
        "No image for this look",
        "This outfit does not have an image URL yet."
      );
      return;
    }

    navigation.navigate("ShareCard", { id: look.id });
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Delete this look from your wardrobe? This can’t be undone."
      );
      if (!ok) return;
      deleteLook(id);
      return;
    }

    Alert.alert(
      "Delete this look?",
      "This will remove the look and its AI notes from your wardrobe.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteLook(id),
        },
      ]
    );
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const limitReached = looks.length >= MAX_LOOKS;

  // ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      {/* background blobs */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* sticky top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBackHome} activeOpacity={0.8}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Wardrobe</Text>

        <View style={styles.countPill}>
          <Text style={styles.countNumber}>{looks.length}</Text>
          <Text style={styles.countLabel}>
            {looks.length === 1 ? "look" : "looks"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          {/* header copy */}
          <Text style={styles.pageTitle}>Your smart wardrobe</Text>
          <Text style={styles.pageSubtitle}>
            Every outfit you&apos;ve rated lives here. Tap a card to see the
            full AI breakdown, open the share card, or tidy up old looks.
          </Text>

          {/* soft limit message */}
          <View style={styles.limitRow}>
            <Text style={styles.limitText}>
              You&apos;ve saved{" "}
              <Text style={styles.limitStrong}>{looks.length}</Text> /{" "}
              <Text style={styles.limitStrong}>{MAX_LOOKS}</Text> looks. To keep
              your wardrobe tidy, delete older outfits you don&apos;t need.
            </Text>
          </View>

          {hasLooks ? (
            <>
              <View style={styles.cardsGrid}>
                {pageLooks.map((look) => (
                  <View key={look.id} style={styles.cardWrapper}>
                    <View style={styles.card}>
                      {/* image */}
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => handleOpenDetail(look)}
                      >
                        <View style={styles.imageWrapper}>
                          <Image
                            source={{ uri: look.imageUri ?? FALLBACK_IMAGE }}
                            style={styles.cardImage}
                            resizeMode="contain"
                          />

                          {typeof look.score === "number" && (
                            <View style={styles.scoreBadge}>
                              <Text style={styles.scoreValue}>
                                {look.score.toFixed(1)}
                              </Text>
                              <Text style={styles.scoreSuffix}>/10</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* body */}
                      <View style={styles.cardBody}>
                        <Text style={styles.vibeText} numberOfLines={2}>
                          {look.vibe || "Saved outfit"}
                        </Text>

                        {Array.isArray(look.tags) && look.tags.length > 0 && (
                          <View style={styles.tagsRow}>
                            {look.tags.slice(0, 3).map((tag, idx) => (
                              <View key={idx} style={styles.tagPill}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* footer row */}
                        <View style={styles.cardFooterRow}>
                          <TouchableOpacity
                            style={styles.cardLink}
                            activeOpacity={0.8}
                            onPress={() => handleOpenDetail(look)}
                          >
                            <Text style={styles.cardLinkText}>View details</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.cardLink}
                            activeOpacity={0.8}
                            onPress={() => handleShareCard(look)}
                          >
                            <Text style={styles.cardLinkText}>Share card</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteButton}
                            activeOpacity={0.8}
                            onPress={() => handleDelete(look.id)}
                          >
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* pagination */}
              {totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      page === 0 && styles.paginationButtonDisabled,
                    ]}
                    disabled={page === 0}
                    onPress={handlePrevPage}
                  >
                    <Text
                      style={[
                        styles.paginationButtonText,
                        page === 0 && styles.paginationButtonTextDisabled,
                      ]}
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.paginationLabel}>
                    Page {page + 1} of {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      page === totalPages - 1 &&
                        styles.paginationButtonDisabled,
                    ]}
                    disabled={page === totalPages - 1}
                    onPress={handleNextPage}
                  >
                    <Text
                      style={[
                        styles.paginationButtonText,
                        page === totalPages - 1 &&
                          styles.paginationButtonTextDisabled,
                      ]}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No looks saved yet</Text>
              <Text style={styles.emptySubtitle}>
                Once you rate an outfit from the upload screen, it will show up
                here with its AI score, notes, and tags.
              </Text>

              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("UploadOutfit")}
              >
                <Text style={styles.emptyButtonText}>Add your first look</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────

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
    backgroundColor: "rgba(129,140,248,0.18)",
    opacity: 1,
  },
  bgBlobPink: {
    position: "absolute",
    bottom: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(244,114,182,0.18)",
    opacity: 1,
  },

  // top bar
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  backText: {
    fontSize: 13,
    color: "#6B7280", // soft grey instead of blue-grey
  },
  topTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827", // main heading color
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
    marginRight: 4,
  },
  countLabel: {
    fontSize: 12,
    color: "#4B5563",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  contentInner: {
    paddingTop: 8,
    paddingBottom: 12,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  limitRow: {
    marginTop: 16,
    marginBottom: 10,
  },
  limitText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  limitStrong: {
    fontWeight: "600",
    color: "#111827",
  },

  cardsGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  cardWrapper: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 14,
  },

  card: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF", // white card
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 8,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  imageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },

  scoreBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.76)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F9FAFB",
  },

  vibeTag: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vibeText: {
    fontSize: 11,
    color: "#4F46E5",
    fontWeight: "500",
  },

  tagsRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tagPill: {
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: "#4B5563",
  },

  cardFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cardMeta: {
    flex: 1,
  },
  cardMetaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  cardMetaValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },

  cardLinkRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  cardLinkText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },

  deleteButton: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  deleteButtonText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
  },

  emptyState: {
    marginTop: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 14,
    textAlign: "center",
  },
  emptyButton: {
    borderRadius: 999,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
  },

  paginationRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 6,
    backgroundColor: "#FFFFFF",
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationButtonText: {
    fontSize: 12,
    color: "#374151",
  },
  paginationButtonTextDisabled: {
    color: "#9CA3AF",
  },
  paginationLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  scoreSuffix: {
    fontSize: 10,
    color: "#DCFCE7",
    marginLeft: 4,
  },

  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  cardLink: {
    marginRight: 10,
  },
});
