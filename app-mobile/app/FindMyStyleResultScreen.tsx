// app/FindMyStyleResultScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../App";
import {
  fetchStyleProfile,
  deleteStyleProfile,
  StyleProfileResult,
} from "../services/styleProfileApi";

type ResultNav = NativeStackNavigationProp<
  RootStackParamList,
  "FindMyStyleResult"
>;
type ResultRoute = RouteProp<RootStackParamList, "FindMyStyleResult">;

const FindMyStyleResultScreen: React.FC = () => {
  const navigation = useNavigation<ResultNav>();
  const route = useRoute<ResultRoute>();

  const initialProfile =
    ((route.params as any)?.profile as StyleProfileResult | undefined) ?? null;

  const [profile, setProfile] = useState<StyleProfileResult | null>(
    initialProfile
  );
  const [loading, setLoading] = useState(!initialProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (initialProfile) return;

      setLoading(true);
      setError(null);

      try {
        const saved = await fetchStyleProfile();
        if (!isMounted) return;

        if (saved) {
          setProfile(saved);
        } else {
          setProfile(null);
          setError(null);
        }
      } catch (e) {
        console.log("fetchStyleProfile error", e);
        if (!isMounted) return;
        setProfile(null);
        setError("We couldn’t load your saved body analysis.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDelete = async () => {
    if (!profile) return;

    Alert.alert(
      "Delete style profile?",
      "This will remove your saved body analysis. You can always run Find my style again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStyleProfile();
              setProfile(null);
              setError(null);
            } catch (e) {
              console.log("deleteStyleProfile error", e);
              Alert.alert(
                "Something went wrong",
                "We couldn’t delete your style profile. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleRunFMS = () => {
    navigation.navigate("FindMyStyle");
  };

  // LOADING
  if (loading) {
    return (
      <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
        <View style={styles.bgBlobBlue} />
        <View style={styles.bgBlobPeach} />
        <View style={styles.centerFallback}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={[styles.fallbackTitle, { marginTop: 12 }]}>
            Loading your style profile…
          </Text>
          <Text style={styles.fallbackText}>
            We’re pulling your saved body analysis from your account.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // EMPTY / NO PROFILE
  if (!profile) {
    return (
      <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
        <View style={styles.bgBlobBlue} />
        <View style={styles.bgBlobPeach} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.topLeft}
                activeOpacity={0.8}
              >
                <Text style={styles.backChevron}>‹</Text>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.eyebrow}>Personal style profile</Text>
              <Text style={styles.title}>No saved body analysis</Text>
              <Text style={styles.subtitle}>
                When you run <Text style={styles.subtitleHighlight}>Find my
                style</Text>, we&apos;ll save your body type, height and color
                blueprint here so you can reuse it for every outfit.
              </Text>

              {error ? (
                <Text style={[styles.helperText, { marginBottom: 10 }]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                onPress={handleRunFMS}
              >
                <Text style={styles.primaryButtonText}>Run Find my style</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // HELPERS FOR RENDERING
  const renderPalette = () => {
    if (!profile.palette || !profile.palette.colors?.length) return null;
    const colors = profile.palette.colors.slice(0, 6);

    return (
      <View style={{ marginTop: 10, marginBottom: 12 }}>
        {profile.palette.name ? (
          <Text style={styles.sectionLabel}>{profile.palette.name}</Text>
        ) : null}
        <View style={styles.paletteRow}>
          {colors.map((c, idx) => (
            <View key={`${c.hex}-${idx}`} style={styles.paletteSwatchWrapper}>
              <View style={[styles.paletteSwatch, { backgroundColor: c.hex }]} />
              {c.label ? (
                <Text style={styles.paletteLabel} numberOfLines={1}>
                  {c.label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBulletList = (items?: string[]) => {
    if (!items || !items.length) return null;
    return (
      <View style={{ marginTop: 4 }}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  };

  // PROFILE PRESENT
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.bgBlobBlue} />
      <View style={styles.bgBlobPeach} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.topLeft}
              activeOpacity={0.8}
            >
              <Text style={styles.backChevron}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>Personal style profile</Text>
            <Text style={styles.title}>Your saved body analysis</Text>
            <Text style={styles.subtitle}>
              This is your AI-generated blueprint based on your body type,
              height and skin tone from{" "}
              <Text style={styles.subtitleHighlight}>Find my style</Text>.
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {profile.bodyType || "Body type"}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {profile.heightDisplay || "Height"}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {profile.skinToneCategory}
                  {profile.undertone ? ` · ${profile.undertone}` : ""}
                </Text>
              </View>
            </View>

            {renderPalette()}
          </View>

          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.cardTitle}>How to dress this body type</Text>

            <Text style={styles.sectionLabel}>Do&apos;s</Text>
            {renderBulletList(profile.dos?.slice(0, 6))}

            <Text style={[styles.sectionLabel, { marginTop: 10 }]}>
              Don&apos;ts
            </Text>
            {renderBulletList(profile.donts?.slice(0, 6))}

            {profile.bestSilhouettes?.length ? (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 10 }]}>
                  Best silhouettes
                </Text>
                {renderBulletList(profile.bestSilhouettes.slice(0, 5))}
              </>
            ) : null}

            {profile.trickyAreasTips?.length ? (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 10 }]}>
                  Tricky areas tips
                </Text>
                {renderBulletList(profile.trickyAreasTips.slice(0, 5))}
              </>
            ) : null}
          </View>

          {/* ONLY ACTION: DELETE PROFILE */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.9}
              onPress={handleDelete}
            >
              <Text style={styles.dangerButtonText}>Delete style profile</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.helperText, { marginTop: 10 }]}>
            After deleting, you can rebuild this profile anytime by running{" "}
            <Text style={{ fontWeight: "600" }}>Find my style</Text> again.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FindMyStyleResultScreen;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  bgBlobBlue: {
    position: "absolute",
    top: -90,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(129,140,248,0.12)",
  },
  bgBlobPeach: {
    position: "absolute",
    top: -40,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  contentInner: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  topBar: {
    marginBottom: 16,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backChevron: {
    fontSize: 18,
    color: "#4B5563",
    marginRight: 2,
  },
  backText: {
    fontSize: 13,
    color: "#6B7280",
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 10,
  },
  subtitleHighlight: {
    fontWeight: "600",
    color: "#111827",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
  },
  metaPillText: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "500",
  },
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  paletteSwatchWrapper: {
    alignItems: "center",
    width: 60,
  },
  paletteSwatch: {
    width: 40,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paletteLabel: {
    marginTop: 4,
    fontSize: 10,
    color: "#4B5563",
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 12,
    color: "#4B5563",
    marginRight: 6,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  actionsRow: {
    marginTop: 18,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
    textAlign: "center",
  },
  dangerButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
  },
  centerFallback: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  fallbackText: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 8,
  },
});
