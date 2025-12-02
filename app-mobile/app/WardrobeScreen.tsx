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

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516646255117-d56e0c644dcd?auto=format&fit=crop&w=900&q=80";

const ITEMS_PER_PAGE = 6;
const MAX_LOOKS = 60; // soft cap message only for now

export default function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const { looks, deleteLook } = useLooks();

  const [page, setPage] = useState(0);

  const totalPages =
    looks.length === 0 ? 1 : Math.ceil(looks.length / ITEMS_PER_PAGE);

  // Reset to first page if looks length shrinks (e.g. delete) or grows in a way that invalidates page index
  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(0);
    }
  }, [looks.length, page, totalPages]);

  const startIndex = page * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageLooks = looks.slice(startIndex, endIndex);

  const hasLooks = looks.length > 0;

  const handleBackHome = () => {
    navigation.navigate("Home");
  };

  const handleOpenDetail = (look: Look) => {
    navigation.navigate("LookDetail", { id: look.id });
  };

  // Re-uses the prefill flow in UploadOutfitScreen
  const handleShareCard = (look: Look) => {
    if (!look.imageUri) {
      Alert.alert(
        "No image for this look",
        "This outfit does not have an image URL yet."
      );
      return;
    }

    navigation.navigate("UploadOutfit", { prefillLook: look });
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Delete this look? This action cannot be undone."
      );
      if (!ok) return;
      deleteLook(id);
      return;
    }

    Alert.alert(
      "Delete this look?",
      "This action cannot be undone.",
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

  return (
    <View style={styles.page}>
      {/* soft background glow */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          {/* top breadcrumb + count */}
          <View style={styles.headerRow}>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity onPress={handleBackHome} activeOpacity={0.8}>
                <Text style={styles.breadcrumbLink}>Home</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbSeparator}>/</Text>
              <Text style={styles.breadcrumbCurrent}>Wardrobe</Text>
            </View>

            <View style={styles.countPill}>
              <Text style={styles.countNumber}>{looks.length}</Text>
              <Text style={styles.countLabel}>
                {looks.length === 1 ? "look" : "looks"}
              </Text>
            </View>
          </View>

          {/* section title + helper copy */}
          <Text style={styles.pageTitle}>Your smart wardrobe</Text>
          <Text style={styles.pageSubtitle}>
            Every outfit you&apos;ve rated lives here. Tap a card to see the
            full AI breakdown, share a social card, or tidy up old looks.
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
                            resizeMode="cover"
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

                        {/* footer buttons */}
                        <View style={styles.cardFooterRow}>
                          <TouchableOpacity
                            style={styles.footerButtonPrimary}
                            activeOpacity={0.9}
                            onPress={() => handleOpenDetail(look)}
                          >
                            <Text style={styles.footerButtonPrimaryText}>
                              Details
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.footerButtonSecondary}
                            activeOpacity={0.9}
                            onPress={() => handleShareCard(look)}
                          >
                            <Text style={styles.footerButtonSecondaryText}>
                              Share card
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteButton}
                            activeOpacity={0.7}
                            onPress={() => handleDelete(look.id)}
                          >
                            <Text style={styles.deleteButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* pagination controls */}
              {totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      page === 0 && styles.paginationButtonDisabled,
                    ]}
                    onPress={handlePrevPage}
                    disabled={page === 0}
                  >
                    <Text
                      style={[
                        styles.paginationButtonText,
                        page === 0 && styles.paginationButtonTextDisabled,
                      ]}
                    >
                      ← Previous
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.paginationLabel}>
                    Page {page + 1} of {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      page === totalPages - 1 && styles.paginationButtonDisabled,
                    ]}
                    onPress={handleNextPage}
                    disabled={page === totalPages - 1}
                  >
                    <Text
                      style={[
                        styles.paginationButtonText,
                        page === totalPages - 1 &&
                          styles.paginationButtonTextDisabled,
                      ]}
                    >
                      Next →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nothing in your wardrobe yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload today&apos;s fit, get a rating, and we&apos;ll save it
                here so you can track your style glow-up over time.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("UploadOutfit")}
              >
                <Text style={styles.emptyButtonText}>Upload an outfit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#020617",
    position: "relative",
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
    top: -40,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(244,114,182,0.25)",
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  contentInner: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  breadcrumbSeparator: {
    fontSize: 13,
    color: "#4B5563",
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.8)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  countLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  pageTitle: {
    fontSize: 22,
    color: "#F9FAFB",
    fontWeight: "700",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 10,
  },
  limitRow: {
    marginBottom: 16,
  },
  limitText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  limitStrong: {
    color: "#E5E7EB",
    fontWeight: "600",
  },
  cardsGrid: {
    width: "100%",
    gap: 16,
  },
  cardWrapper: {
    width: "100%",
  },
  card: {
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "#111827",
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#020617",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  scoreBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(21,128,61,0.9)",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ECFDF5",
  },
  scoreSuffix: {
    fontSize: 11,
    color: "#BBF7D0",
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  vibeText: {
    fontSize: 14,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "#374151",
  },
  tagText: {
    fontSize: 11,
    color: "#E5E7EB",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  footerButtonPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#6366F1",
  },
  footerButtonPrimaryText: {
    fontSize: 12,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  footerButtonSecondary: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  footerButtonSecondaryText: {
    fontSize: 12,
    color: "#E5E7EB",
  },
  deleteButton: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyState: {
    marginTop: 40,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "#111827",
  },
  emptyTitle: {
    fontSize: 18,
    color: "#F9FAFB",
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 14,
  },
  emptyButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#6366F1",
  },
  emptyButtonText: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  paginationRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationButtonText: {
    fontSize: 12,
    color: "#E5E7EB",
  },
  paginationButtonTextDisabled: {
    color: "#6B7280",
  },
  paginationLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
