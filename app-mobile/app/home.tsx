// app-mobile/app/HomeScreen.tsx

import { useLooks } from "../context/LooksContext";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from "react-native";
import { useWindowDimensions } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

export default function HomeScreen() {
  const { user, signOutUser } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const isSmallScreen = width <= 600;
  const { looks } = useLooks(); // 👈 NEW

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const usernameRaw = user?.email?.split("@")[0] ?? "stylist";
  const firstName =
    usernameRaw.charAt(0).toUpperCase() + usernameRaw.slice(1);

  return (
    <View style={styles.page}>
      {/* subtle colored glow behind */}
      <View style={styles.gradientBg} />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View
          style={[
            styles.topBarInner,
            isSmallScreen && styles.topBarInnerSmall,
          ]}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>AI</Text>
            </View>
            <View>
              <Text style={styles.logoText}>AI Stylist</Text>
              <Text style={styles.logoTagline}>Dress smarter, not harder.</Text>
            </View>
          </View>

          <View
            style={[
              styles.topRight,
              isSmallScreen && styles.topRightSmall,
            ]}
          >
            <View style={styles.userChip}>
              <Text style={styles.userInitial}>
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </Text>
              <View style={{ marginLeft: 8, flexShrink: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.email}
                </Text>
                <Text style={styles.userTag}>Early access</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={signOutUser}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        horizontal={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Center and limit width so it doesn't stretch like a dashboard */}
        <View style={styles.contentInner}>
          {/* HERO SECTION */}
          <View
            style={[
              styles.heroRow,
              isLargeScreen ? styles.heroRowLarge : styles.heroRowStack,
            ]}
          >
            {/* Left: copy + CTAs */}
            <View style={styles.heroLeft}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  ✨ New · AI-powered outfit rating
                </Text>
              </View>

              <Text style={styles.heroGreeting}>Hey {firstName},</Text>
              <Text style={styles.heroTitle}>
                turn your wardrobe into your{" "}
                <Text style={styles.heroTitleAccent}>
                  personal AI stylist.
                </Text>
              </Text>

              <Text style={styles.heroSubtitle}>
                Upload today’s outfit, get styling tips, see before/after
                suggestions, and slowly build a smart digital closet.
              </Text>

              <View style={styles.heroButtonsRow}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate("UploadOutfit")}
                >
                  <Text style={styles.primaryButtonText}>
                    🚀 Start with today’s outfit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    // Future: chat stylist screen
                    console.log("Ask my stylist tapped");
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    💬 Ask my stylist
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipsRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>OOTD rating</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Wardrobe planner</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Color combos</Text>
                </View>
              </View>
            </View>

            {/* Right: hero visual placeholder */}
            <View style={styles.heroRight}>
              <View style={styles.heroArtCard}>
                <View style={styles.heroArtOutline}>
                  <Image
                    source={
                      require("../assets/hero.png")
                    }
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.heroTagCardLeft}>
                  <Text style={styles.heroTagTitle}>Today’s vibe</Text>
                  <Text style={styles.heroTagBody}>
                    Smart casual · 8/10 fit
                  </Text>
                </View>
                <View style={styles.heroTagCardRight}>
                  <Text style={styles.heroTagTitle}>AI tweak</Text>
                  <Text style={styles.heroTagBody}>
                    Try white sneakers instead
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* AI MODES */}
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>FEATURE PREVIEW</Text>
            <Text style={styles.sectionTitle}>Play with your AI stylist</Text>
            <Text style={styles.sectionSubtitle}>
              These modes are placeholders for now. We’ll wire them to real
              screens and APIs later.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modesRow}
            >
              <TouchableOpacity
                style={[styles.modeCard, styles.modeCardPink]}
                onPress={() => console.log("Mode: Outfit Lab tapped")}
              >
                <Text style={styles.modeEmoji}>🧪</Text>
                <Text style={styles.modeTitle}>Outfit Lab</Text>
                <Text style={styles.modeBody}>
                  Remix your outfit with AI. Try color swaps, different jackets,
                  and new shoes.
                </Text>
                <Text style={styles.modeTag}>Prototype</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, styles.modeCardBlue]}
                onPress={() => console.log("Mode: Wardrobe AI tapped")}
              >
                <Text style={styles.modeEmoji}>🧳</Text>
                <Text style={styles.modeTitle}>Wardrobe AI</Text>
                <Text style={styles.modeBody}>
                  Turn your closet into digital cards and auto-plan outfits for
                  the week.
                </Text>
                <Text style={styles.modeTag}>Prototype</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, styles.modeCardPurple]}
                onPress={() => console.log("Mode: Chat Stylist tapped")}
              >
                <Text style={styles.modeEmoji}>🤖</Text>
                <Text style={styles.modeTitle}>Chat with stylist</Text>
                <Text style={styles.modeBody}>
                  Ask “What do I wear for a winter date?” and get instant looks.
                </Text>
                <Text style={styles.modeTag}>Prototype</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* BOTTOM ROW: challenge + recent looks */}
          <View
            style={[
              styles.bottomRow,
              isLargeScreen ? styles.bottomRowLarge : styles.bottomRowStack,
            ]}
          >
            {/* Today’s challenge */}
            <View style={styles.sectionHalf}>
              <Text style={styles.sectionEyebrow}>TODAY</Text>
              <Text style={styles.sectionTitle}>Today’s style challenge</Text>
              <View style={styles.challengeCard}>
                <Text style={styles.challengeTitle}>
                  “One statement piece only.”
                </Text>
                <Text style={styles.challengeBody}>
                  Choose one item to be the star (shoes, jacket, or bag). Keep
                  everything else minimal so that piece pops.
                </Text>

                <View style={styles.progressRow}>
                  <View style={styles.progressBarBg}>
                    <View style={styles.progressBarFill} />
                  </View>
                  <Text style={styles.progressLabel}>0 / 1 look uploaded</Text>
                </View>

                <TouchableOpacity
                  style={styles.challengeButton}
                  onPress={() => navigation.navigate("UploadOutfit")}
                >
                  <Text style={styles.challengeButtonText}>
                    Upload today’s look
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent looks */}
            <View style={styles.sectionHalf}>
              <Text style={styles.sectionEyebrow}>DIARY</Text>
              <Text style={styles.sectionTitle}>Recent looks</Text>
              <Text style={styles.sectionSubtitle}>
                Once you start uploading, this becomes your personal OOTD diary
                with AI scores.
              </Text>
              <TouchableOpacity
                style={{ marginTop: 6, alignSelf: "flex-start" }}
                onPress={() => navigation.navigate("Wardrobe")}
              >
                <Text style={{ fontSize: 12, color: "#A5B4FC" }}>
                  View full wardrobe →
                </Text>
              </TouchableOpacity>
              <View style={styles.looksRow}>
                {looks.length === 0 ? (
                  // fallback placeholders
                  ["Street fit", "Workday", "Night out"].map((label, index) => (
                    <View key={index} style={styles.lookCard}>
                      <View style={styles.lookThumbPlaceholder}>
                        <Text style={styles.lookThumbText}>Image</Text>
                      </View>
                      <Text style={styles.lookLabel}>{label}</Text>
                      <Text style={styles.lookMeta}>AI rating: — / 10</Text>
                    </View>
                  ))
                ) : (
                  looks.slice(0, 3).map((look) => (
                    <View key={look.id} style={styles.lookCard}>
                      <View style={styles.lookThumbPlaceholder}>
                        {look.imageUri ? (
                          <Image
                            source={{ uri: look.imageUri }}
                            style={styles.lookThumbImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.lookThumbText}>No image</Text>
                        )}
                      </View>
                      <Text style={styles.lookLabel}>
                        {look.vibe ?? "Saved look"}
                      </Text>
                      <Text style={styles.lookMeta}>
                        {look.score != null
                          ? `AI rating: ${look.score.toFixed(1)} / 10`
                          : "No rating"}
                      </Text>
                    </View>
                  ))
                )}
              </View>


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
    backgroundColor: "#020617", // slate-950
    position: "relative",
  },
  gradientBg: {
    position: "absolute",
    top: -120,
    left: -60,
    right: -60,
    height: 260,
    backgroundColor: "transparent",
    shadowColor: "#6366F1",
    shadowOpacity: 0.45,
    shadowRadius: 80,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#0B1120",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topBarInner: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarInnerSmall: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
  },
  logoMarkText: {
    fontSize: 14,
    color: "#F9FAFB",
    fontWeight: "800",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  logoTagline: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topRightSmall: {
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "#1F2937",
    maxWidth: 220,
    flexShrink: 1,
  },
  userInitial: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#A855F7",
    textAlign: "center",
    textAlignVertical: "center",
    color: "#F9FAFB",
    fontWeight: "700",
  },
  userName: {
    fontSize: 12,
    color: "#E5E7EB",
  },
  userTag: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  signOutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  signOutText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contentInner: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    gap: 24,
  },
  heroRow: {
    width: "100%",
    gap: 18,
    marginBottom: 4,
  },
  heroRowLarge: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroRowStack: {
    flexDirection: "column",
  },
  heroLeft: {
    flex: 1.2,
  },
  heroPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(129,140,248,0.18)",
    marginBottom: 10,
  },
  heroPillText: {
    fontSize: 11,
    color: "#C7D2FE",
  },
  heroGreeting: {
    fontSize: 14,
    color: "#E5E7EB",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  heroTitleAccent: {
    color: "#A855F7",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 16,
    maxWidth: 480,
  },
  heroButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 14,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: "#E5E7EB",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(30,64,175,0.3)",
  },
  chipText: {
    fontSize: 11,
    color: "#C7D2FE",
  },
  heroRight: {
    flex: 1,
  },
  heroArtCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.4)",
    position: "relative",
    overflow: "hidden",
  },
  heroArtOutline: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(148,163,184,0.7)",
    padding: 16,
    minHeight: 180,
    justifyContent: "center",
  },
  heroArtLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  heroArtText: {
    fontSize: 13,
    color: "#E5E7EB",
    marginBottom: 6,
  },
  heroArtHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  heroTagCardLeft: {
    position: "absolute",
    left: 16,
    bottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(15,118,110,0.9)",
  },
  heroTagCardRight: {
    position: "absolute",
    right: 16,
    top: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(129,140,248,0.92)",
  },
  heroTagTitle: {
    fontSize: 11,
    color: "#ECFEFF",
    fontWeight: "600",
  },
  heroTagBody: {
    fontSize: 11,
    color: "#E5E7EB",
  },
  section: {
    width: "100%",
    marginTop: 8,
  },
  sectionEyebrow: {
    fontSize: 11,
    color: "#9CA3AF",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 10,
  },
  modesRow: {
    paddingVertical: 4,
    gap: 12,
  },
  modeCard: {
    width: 220,
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
  },
  modeCardPink: {
    backgroundColor: "rgba(244,114,182,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,114,182,0.4)",
  },
  modeCardBlue: {
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
  },
  modeCardPurple: {
    backgroundColor: "rgba(168,85,247,0.12)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.4)",
  },
  modeEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  modeBody: {
    fontSize: 12,
    color: "#E5E7EB",
    marginBottom: 8,
  },
  modeTag: {
    fontSize: 11,
    color: "#F9A8D4",
  },
  bottomRow: {
    width: "100%",
    gap: 18,
    marginTop: 16,
  },
  bottomRowLarge: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bottomRowStack: {
    flexDirection: "column",
  },
  sectionHalf: {
    flex: 1,
    minWidth: 260,
  },
  challengeCard: {
    marginTop: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "#111827",
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  challengeBody: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  progressBarFill: {
    width: "20%",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  progressLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  challengeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  challengeButtonText: {
    fontSize: 12,
    color: "#E5E7EB",
    fontWeight: "500",
  },
  looksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  lookCard: {
    flexBasis: "30%",
    minWidth: 150,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "#111827",
  },
  lookThumbPlaceholder: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4B5563",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lookThumbImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  lookThumbText: {
    fontSize: 11,
    color: "#6B7280",
  },
  lookLabel: {
    fontSize: 13,
    color: "#E5E7EB",
    marginBottom: 2,
  },
  lookMeta: {
    fontSize: 11,
    color: "#6B7280",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  
});
