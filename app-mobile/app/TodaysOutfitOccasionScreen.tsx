// app/TodaysOutfitOccasionScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { API_BASE_URL } from "../config/api";
import { auth } from "../services/firebase";

const OCCASIONS = [
  { id: "formal", label: "Formal / Office", emoji: "🧥" },
  { id: "smart_casual", label: "Smart casual", emoji: "👔" },
  { id: "casual", label: "Casual / Everyday", emoji: "👕" },
  { id: "desi", label: "Desi / Eastern", emoji: "🕌" },
  { id: "party", label: "Party / Night out", emoji: "🎉" },
  { id: "date", label: "Date / Coffee", emoji: "☕️" },
];

const TodaysOutfitOccasionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedId) return;

    // Gate: make sure user has a style profile first.
    try {
      const token = await auth.currentUser?.getIdToken?.();

      const res = await fetch(`${API_BASE_URL}/ai/style-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 404) {
        Alert.alert(
          "Add your style profile first",
          "To personalise outfits, we need your body type, height and tones from Find my style.",
          [
            {
              text: "Not now",
              style: "cancel",
            },
            {
              text: "Open Find my style",
              onPress: () => {
                // @ts-ignore – depends on your navigator type
                navigation.navigate("FindMyStyle");
              },
            },
          ]
        );
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.log(
          "TodaysOutfitOccasion: style-profile check failed",
          res.status,
          text
        );
        // Fail-open: we still let them continue so the feature isn’t blocked
        // if the server hiccups.
      }
    } catch (error) {
      console.log("TodaysOutfitOccasion: error checking style-profile", error);
      // Fail-open here as well.
    }

    const selected = OCCASIONS.find((o) => o.id === selectedId);
    navigation.navigate("TodaysOutfitBuilder", {
      occasionId: selectedId,
      occasionLabel: selected?.label ?? selectedId,
    });
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      {/* soft color blobs */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Today&apos;s vibe</Text>
        </View>

        <View style={styles.topRight}>
          <Text style={styles.betaTag}>Uses your style profile</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>STEP 1 · OCCASION</Text>
          <Text style={styles.heading}>What are you dressing for today?</Text>
          <Text style={styles.subheading}>
            Your AI stylist will pick pieces differently if it&apos;s a coffee
            date, a desi function, or a regular office day.
          </Text>
        </View>

        <View style={styles.cardGrid}>
          {OCCASIONS.map((oc) => {
            const selected = oc.id === selectedId;
            return (
              <TouchableOpacity
                key={oc.id}
                style={[
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedId(oc.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionEmoji}>{oc.emoji}</Text>
                <Text style={styles.optionLabel}>{oc.label}</Text>
                {selected && (
                  <Text style={styles.optionSelectedText}>Selected</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !selectedId && { opacity: 0.4 },
            ]}
            onPress={handleContinue}
            disabled={!selectedId}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Next: add clothes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TodaysOutfitOccasionScreen;

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
    backgroundColor: "rgba(191,219,254,0.5)", // soft blue
  },
  bgBlobPink: {
    position: "absolute",
    bottom: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(254,226,226,0.5)", // soft pink
  },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backText: {
    fontSize: 13,
    color: "#6B7280",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  topRight: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  betaTag: {
    fontSize: 11,
    color: "#6B7280",
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

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionCard: {
    flexBasis: "48%",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  optionCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F3F4FF",
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  optionSelectedText: {
    marginTop: 4,
    fontSize: 11,
    color: "#4B5563",
  },

  footerRow: {
    marginTop: 24,
    marginBottom: 8,
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
});
