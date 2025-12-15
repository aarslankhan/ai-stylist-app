// app/home.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useWindowDimensions } from "react-native";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { useLooks } from "../context/LooksContext";
import type { RootStackParamList } from "../App";

type WeatherState = {
  temp: number;
  min: number;
  max: number;
  description: string;
  locationName: string | null;
};

const getFirstNameFromUser = (user: any): string => {
  if (user?.displayName && typeof user.displayName === "string") {
    const trimmed = user.displayName.trim();
    if (trimmed.length > 0) {
      const [first] = trimmed.split(" ");
      if (first) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
  }

  const email: string | undefined = user?.email;
  if (email && email.includes("@")) {
    const local = email.split("@")[0] ?? "";
    const cleaned = local.replace(/[._-]+/g, " ").trim();
    if (cleaned.length > 0) {
      const [first] = cleaned.split(" ");
      if (first) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
  }

  return "Stylist";
};

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { user, signOutUser } = useAuth();
  const { looks } = useLooks();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900;
  const isCompactScreen = width < 380;

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherState | null>(null);

  const firstName = getFirstNameFromUser(user);

  const recentLooks = [...looks]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const lastLook = recentLooks[0];

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const looksThisWeek = looks.filter(
    (look) => typeof look.createdAt === "number" && look.createdAt >= sevenDaysAgo
  );

  const streakDaysSet = new Set<string>();
  looksThisWeek.forEach((look) => {
    if (typeof look.createdAt === "number") {
      streakDaysSet.add(new Date(look.createdAt).toDateString());
    }
  });
  const styleStreakDays = streakDaysSet.size;

  const today = new Date();
  const todayLabel = today
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .replace(",", " ·");

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOutUser();
  };

  // WEATHER via Open-Meteo
  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        if (!loc || cancelled) return;

        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;

        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current_weather=true&daily=temperature_2m_max,temperature_2m_min` +
          `&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;

        const current = data.current_weather;
        const daily = data.daily;

        const temp = current?.temperature ?? null;
        const min = daily?.temperature_2m_min?.[0] ?? null;
        const max = daily?.temperature_2m_max?.[0] ?? null;
        if (temp == null || min == null || max == null) return;

        const description = "Today";

        let cityName: string | null = null;
        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lon,
          });
          if (rev && rev.length > 0) {
            const first = rev[0];
            cityName =
              first.city ||
              first.district ||
              first.subregion ||
              first.region ||
              null;
          }
        } catch {
          cityName = null;
        }

        setWeather({
          temp,
          min,
          max,
          description,
          locationName: cityName,
        });
      } catch (err) {
        console.log("weather load error", err);
      }
    };

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.page}>
      {/* pastel background accents */}
      <View style={styles.bgBlobLeft} />
      <View style={styles.bgBlobRight} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        {/* FULL-WIDTH STICKY NAVBAR */}
        <View style={styles.headerSticky}>
          <View style={styles.headerBar}>
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>A</Text>
              </View>
              <View>
                <Text style={styles.logoText}>AI Stylist</Text>
                <Text style={styles.logoSub}>
                  Built around{" "}
                  {firstName === "Stylist" ? "your day." : `${firstName}.`}
                </Text>
              </View>
            </View>

            <View>
              <TouchableOpacity
                style={styles.userChip}
                activeOpacity={0.8}
                onPress={() => setUserMenuOpen((v) => !v)}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {firstName?.charAt(0) ?? "S"}
                  </Text>
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.userChipName}>Hi, {firstName}</Text>
                  <Text style={styles.userChipSub}>Profile & settings</Text>
                </View>
              </TouchableOpacity>

              {userMenuOpen && (
                <View style={styles.userMenu}>
                  <TouchableOpacity
                    style={styles.userMenuItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      setUserMenuOpen(false);
                      navigation.navigate("Profile");
                    }}
                  >
                    <Text style={styles.userMenuItemText}>
                      Open profile & settings
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.userMenuItem, styles.userMenuSignOut]}
                    activeOpacity={0.8}
                    onPress={handleSignOut}
                  >
                    <Text
                      style={[styles.userMenuItemText, { color: "#DC2626" }]}
                    >
                      Sign out
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* MAIN CONTENT (with its own side padding) */}
        <View style={styles.mainContainer}>
          <View style={styles.inner}>
            {/* TODAY + WEATHER */}
            <View
              style={[
                styles.todayCard,
                isCompactScreen && { paddingHorizontal: 14 },
              ]}
            >
              <View style={styles.todayTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayLabel}>Today</Text>
                  <Text style={styles.todayDate}>{todayLabel}</Text>
                </View>

                {weather && (
                  <View style={styles.weatherBlock}>
                    <Text style={styles.weatherLocation} numberOfLines={1}>
                      {weather.locationName ?? "Your area"}
                    </Text>
                    <Text style={styles.weatherTempRow}>
                      {Math.round(weather.temp)}°
                      <Text style={styles.weatherMinMax}>
                        {"  "}
                        {Math.round(weather.min)}° /{" "}
                        {Math.round(weather.max)}°
                      </Text>
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.todayStatsRow}>
                <View style={styles.todayStat}>
                  <Text style={styles.todayStatValue}>
                    {styleStreakDays > 0 ? styleStreakDays : "—"}
                  </Text>
                  <Text style={styles.todayStatLabel}>day streak</Text>
                </View>
                <View style={styles.separatorDot} />
                <View style={styles.todayStat}>
                  <Text style={styles.todayStatValue}>
                    {looksThisWeek.length}
                  </Text>
                  <Text style={styles.todayStatLabel}>looks this week</Text>
                </View>
              </View>
            </View>

            {/* RESUME LAST OUTFIT (outside Today card) */}
            {lastLook && (
              <TouchableOpacity
                style={styles.resumePillOuter}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("LookDetail", { id: lastLook.id })
                }
              >
                <Text style={styles.resumePillText} numberOfLines={1}>
                  ⏱ Resume last outfit
                </Text>
              </TouchableOpacity>
            )}

            {/* HERO */}
            <View
              style={[
                styles.heroCard,
                isLargeScreen && {
                  flexDirection: "row",
                  alignItems: "center",
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>Daily styling</Text>
                <Text style={styles.heroTitle}>
                  What are we doing with your outfit today?
                </Text>
                <Text style={styles.heroBody}>
                  Upload a look, plan for an event, or check your saved body
                  analysis. Everything starts here.
                </Text>

                <View style={styles.heroButtonsRow}>
                  <TouchableOpacity
                    style={[styles.heroButton, styles.heroButtonPrimary]}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("UploadOutfit")}
                  >
                    <Text style={styles.heroButtonPrimaryText}>
                      Analyze today&apos;s outfit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.heroButton, styles.heroButtonSecondary]}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate("TodaysOutfitOccasion")
                    }
                  >
                    <Text style={styles.heroButtonSecondaryText}>
                      Plan for an occasion
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.heroTertiary}
                  activeOpacity={0.9}
                  onPress={() =>
                    // @ts-ignore
                    navigation.navigate("FindMyStyleResult")
                  }
                >
                  <Text style={styles.heroTertiaryText}>
                    My saved body analysis
                  </Text>
                </TouchableOpacity>
              </View>

              {isLargeScreen && lastLook && (
                <View style={styles.heroRight}>
                  <View style={styles.heroSnapshotCard}>
                    <Text style={styles.heroSnapshotLabel}>Recent score</Text>
                    <Text style={styles.heroSnapshotScore}>
                      {lastLook.score != null
                        ? lastLook.score.toFixed(1)
                        : "—"}
                    </Text>
                    <Text style={styles.heroSnapshotVibe} numberOfLines={2}>
                      {lastLook.vibe || "Upload a look to start tracking."}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* MOBILE RECENT SCORE */}
            {!isLargeScreen && lastLook && (
              <View style={styles.mobileScoreCard}>
                <Text style={styles.mobileScoreTitle}>
                  Recent outfit score
                </Text>
                <View style={styles.mobileScoreRow}>
                  <Text style={styles.mobileScoreValue}>
                    {lastLook.score != null ? lastLook.score.toFixed(1) : "—"}
                  </Text>
                  <View style={styles.mobileScoreDivider} />
                  <Text style={styles.mobileScoreVibe} numberOfLines={1}>
                    {lastLook.vibe || "Most recent look"}
                  </Text>
                </View>
                {lastLook.tags && lastLook.tags.length > 0 && (
                  <View style={styles.mobileScoreTagsRow}>
                    {lastLook.tags
                      .slice(0, 2)
                      .map((tag: string, idx: number) => (
                        <View key={idx} style={styles.mobileScoreTag}>
                          <Text style={styles.mobileScoreTagText}>{tag}</Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            )}

            {/* START A STYLING FLOW */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Start a styling flow</Text>
                <Text style={styles.sectionSubtitle}>
                  Use AI around how you actually get dressed.
                </Text>
              </View>

              <View style={styles.toolsRow}>
                <TouchableOpacity
                  style={[styles.toolCard, styles.toolCardAccent]}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("TodaysOutfitOccasion")
                  }
                >
                  <Text style={styles.toolEmoji}>🎯</Text>
                  <Text style={styles.toolTitle}>Today&apos;s occasion</Text>
                  <Text style={styles.toolBody}>
                    Pick an event, drop in 2–3 pieces from your wardrobe, and
                    let AURA finish the look.
                  </Text>
                  <Text style={styles.toolTag}>Best for everyday use</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("FindMyStyle")}
                >
                  <Text style={styles.toolEmoji}>🧍‍♀️</Text>
                  <Text style={styles.toolTitle}>Find my style (FMS)</Text>
                  <Text style={styles.toolBody}>
                    Lock in body type, height and color zones once so every
                    future suggestion is personal.
                  </Text>
                  <Text style={styles.toolTag}>Setup once, reuse forever</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Wardrobe")}
                >
                  <Text style={styles.toolEmoji}>🧳</Text>
                  <Text style={styles.toolTitle}>Wardrobe & history</Text>
                  <Text style={styles.toolBody}>
                    Reopen past looks, reuse share cards, and see which outfits
                    scored highest.
                  </Text>
                  <Text style={styles.toolTag}>Your outfit archive</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RECENT LOOKS */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent looks</Text>
                <Text style={styles.sectionSubtitle}>
                  Saved from AI analysis and your wardrobe.
                </Text>
              </View>

              {recentLooks.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No looks yet</Text>
                  <Text style={styles.emptyStateBody}>
                    Upload your first outfit so AURA has something to learn
                    from.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("UploadOutfit")}
                  >
                    <Text style={styles.emptyStateButtonText}>
                      Add your first outfit
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.looksRow}
                >
                  {recentLooks.map((look) => (
                    <TouchableOpacity
                      key={look.id}
                      style={styles.lookCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate("LookDetail", { id: look.id })
                      }
                    >
                      {look.imageUri ? (
                        <Image
                          source={{ uri: look.imageUri }}
                          style={styles.lookImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.lookImagePlaceholder}>
                          <Text style={styles.lookImagePlaceholderText}>
                            No image
                          </Text>
                        </View>
                      )}
                      <View style={styles.lookMetaRow}>
                        <Text style={styles.lookMetaScore}>
                          {look.score != null
                            ? `${look.score.toFixed(1)}/10`
                            : "No score"}
                        </Text>
                        <Text numberOfLines={1} style={styles.lookMetaVibe}>
                          {look.vibe || "Styled look"}
                        </Text>
                      </View>
                      {look.tags && look.tags.length > 0 && (
                        <View style={styles.lookTagsRow}>
                          {look.tags.slice(0, 2).map((tag, idx) => (
                            <View
                              style={styles.lookTag}
                              key={`${look.id}-${idx}`}
                            >
                              <Text style={styles.lookTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
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
    backgroundColor: "#fceffaff",
  },
  bgBlobLeft: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(191,219,254,0.4)",
  },
  bgBlobRight: {
    position: "absolute",
    top: -80,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(254,226,226,0.4)",
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // wrapper for all content under navbar
  mainContainer: {
    width: "100%",
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 900,
    paddingHorizontal: 16,
    marginTop: 12,
  },

  // NAVBAR
  headerSticky: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  headerBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6, // reduced height
    backgroundColor: "#FFFFFF",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  logoMarkText: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "800",
  },
  logoText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  logoSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  userChipName: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
  userChipSub: {
    fontSize: 10,
    color: "#6B7280",
  },
  userMenu: {
    position: "absolute",
    top: 38,
    right: 0,
    minWidth: 170,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  userMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userMenuItemText: {
    fontSize: 12,
    color: "#111827",
  },
  userMenuSignOut: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  // TODAY + WEATHER
  todayCard: {
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  todayTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  todayLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#9CA3AF",
  },
  todayDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  todayStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  todayStat: {
    alignItems: "flex-start",
  },
  todayStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  todayStatLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  separatorDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
  },
  weatherBlock: {
    alignItems: "flex-end",
    maxWidth: 140,
  },
  weatherLocation: {
    fontSize: 11,
    color: "#6B7280",
  },
  weatherTempRow: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  weatherMinMax: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "400",
  },

  // Resume last outfit
  resumePillOuter: {
    alignSelf: "flex-start",
    marginTop: 2,
    marginBottom: 14,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#111827",
  },
  resumePillText: {
    fontSize: 12,
    color: "#F9FAFB",
    fontWeight: "500",
  },

  // HERO
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 18,
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  heroBody: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 14,
  },
  heroButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroButton: {
    flexGrow: 1,
    flexBasis: "48%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  heroButtonPrimary: {
    backgroundColor: "#111827",
  },
  heroButtonPrimaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
    textAlign: "center",
  },
  heroButtonSecondary: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  heroButtonSecondaryText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
  },
  heroTertiary: {
    marginTop: 10,
  },
  heroTertiaryText: {
    fontSize: 11,
    color: "#4B5563",
    textDecorationLine: "underline",
  },
  heroRight: {
    marginTop: 12,
    marginLeft: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSnapshotCard: {
    width: 210,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  heroSnapshotLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  heroSnapshotScore: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  heroSnapshotVibe: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 4,
  },

  // MOBILE SCORE
  mobileScoreCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  mobileScoreTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  mobileScoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mobileScoreValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  mobileScoreDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  mobileScoreVibe: {
    fontSize: 12,
    color: "#111827",
    flex: 1,
  },
  mobileScoreTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  mobileScoreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  mobileScoreTagText: {
    fontSize: 10,
    color: "#4B5563",
  },

  // SECTIONS + LOOKS
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  toolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  toolCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toolCardAccent: {
    backgroundColor: "#F9FAFB",
    borderColor: "#111827",
  },
  toolEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  toolBody: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 8,
  },
  toolTag: {
    fontSize: 10,
    color: "#4B5563",
  },
  emptyStateCard: {
    marginTop: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyStateTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyStateBody: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 10,
  },
  emptyStateButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  emptyStateButtonText: {
    fontSize: 12,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  looksRow: {
    marginTop: 10,
    paddingRight: 4,
    gap: 10,
  },
  lookCard: {
    width: 130,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginRight: 10,
  },
  lookImage: {
    width: "100%",
    height: 120,
  },
  lookImagePlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  lookImagePlaceholderText: {
    fontSize: 11,
    color: "#6B7280",
  },
  lookMetaRow: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lookMetaScore: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
  },
  lookMetaVibe: {
    fontSize: 11,
    color: "#111827",
    marginLeft: 6,
    flex: 1,
  },
  lookTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 4,
  },
  lookTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  lookTagText: {
    fontSize: 9,
    color: "#6B7280",
  },
});
