// app/FindMyStyleScreen.tsx
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
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { API_BASE_URL } from "../config/api";
import { auth } from "../services/firebase";
import type { RootStackParamList } from "../App";

type GenderChoice = "male" | "female";

type StyleProfile = {
  gender: GenderChoice;
  bodyType: string;
  heightDisplay: string;
  heightCm?: number;
  skinToneCategory: string;
  undertone?: string;
  palette?: {
    name: string;
    colors: { hex: string; label: string }[];
  };
  dos?: string[];
  donts?: string[];
  bestSilhouettes?: string[];
  trickyAreasTips?: string[];
  createdAt?: string;
};

type FindMyStyleNav = NativeStackNavigationProp<
  RootStackParamList,
  "FindMyStyle"
>;

const MALE_BODY_TYPES = [
  {
    id: "rectangle",
    name: "Rectangle",
    description: "Shoulders, waist and hips are almost the same width.",
  },
  {
    id: "inverted_triangle",
    name: "Inverted triangle",
    description: "Broader shoulders, narrower waist and hips.",
  },
  {
    id: "triangle",
    name: "Triangle",
    description: "Hips and seat slightly wider than shoulders.",
  },
  {
    id: "athletic_v",
    name: "Athletic / V",
    description: "Defined shoulders and chest with a narrower waist.",
  },
];

const FEMALE_BODY_TYPES = [
  {
    id: "hourglass",
    name: "Hourglass",
    description: "Bust and hips similar in width with a defined waist.",
  },
  {
    id: "pear",
    name: "Pear / Triangle",
    description: "Hips fuller or wider than shoulders.",
  },
  {
    id: "inv_triangle",
    name: "Inverted triangle",
    description: "Shoulders or bust broader than hips.",
  },
  {
    id: "rectangle",
    name: "Rectangle",
    description: "Bust, waist and hips very similar in width.",
  },
];

const SKIN_TONES = [
  { id: "fair_cool", label: "Fair · Cool" },
  { id: "light_neutral", label: "Light · Neutral" },
  { id: "medium_warm", label: "Medium · Warm" },
  { id: "tan_olive", label: "Tan · Olive" },
  { id: "deep_warm", label: "Deep · Warm" },
  { id: "deep_cool", label: "Deep · Cool" },
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4c?auto=format&fit=crop&w=900&q=80";

const FindMyStyleScreen: React.FC = () => {
  const navigation = useNavigation<FindMyStyleNav>();

  const [step, setStep] = useState<number>(1);
  const [gender, setGender] = useState<GenderChoice>("male"); // later: prefill from profile

  const [bodyTypeId, setBodyTypeId] = useState<string | null>(null);

  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("ft");
  const [heightCm, setHeightCm] = useState<string>("");
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");

  const [skinToneId, setSkinToneId] = useState<string | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(
    "image/jpeg"
  );

  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<StyleProfile | null>(null);

  const isWeb = Platform.OS === "web";

  const goNext = () => setStep((s) => Math.min(s + 1, 4));
  const goBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  };

  const getBodyTypesForGender = () =>
    gender === "male" ? MALE_BODY_TYPES : FEMALE_BODY_TYPES;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need access to your photos to pick a full-body picture."
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
    let finalUri = asset.uri ?? null;
    let finalBase64: string | null = asset.base64 ?? null;
    let finalMimeType: string = (asset as any).mimeType || "image/jpeg";

    if (!isWeb && asset.uri) {
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
        if (manipulated.base64) finalBase64 = manipulated.base64;
        finalMimeType = "image/jpeg";
      } catch (err) {
        console.log("Image compression failed, using original.", err);
      }
    }

    setImageUri(finalUri);
    setImageBase64(finalBase64);
    setImageMimeType(finalMimeType);
  };

  const computeHeight = () => {
    if (heightUnit === "cm") {
      const cm = parseFloat(heightCm);
      if (!cm || cm < 100 || cm > 230) return { cm: undefined, display: "" };
      return { cm, display: `${cm.toFixed(0)} cm` };
    }

    const ft = parseFloat(heightFt);
    const inches = parseFloat(heightIn || "0");
    if (!ft || ft < 4 || ft > 7) return { cm: undefined, display: "" };
    const totalIn = ft * 12 + (isNaN(inches) ? 0 : inches);
    const cm = totalIn * 2.54;
    const display = `${ft}'${isNaN(inches) ? 0 : inches}"`;
    return { cm, display };
  };

  const handleGenerateProfile = async () => {
    if (!bodyTypeId) {
      Alert.alert("Body type", "Please select the body shape closest to you.");
      setStep(1);
      return;
    }
    const height = computeHeight();
    if (!height.cm || !height.display) {
      Alert.alert(
        "Height",
        "Please add a realistic height in centimetres or feet & inches."
      );
      setStep(2);
      return;
    }
    if (!skinToneId) {
      Alert.alert("Skin tone", "Please choose the skin tone closest to you.");
      setStep(3);
      return;
    }
    if (!imageBase64) {
      Alert.alert(
        "Full-body photo",
        "Please upload a recent full-body picture of yourself."
      );
      setStep(4);
      return;
    }

    try {
      setSubmitting(true);

      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      const selectedBodyType = getBodyTypesForGender().find(
        (b) => b.id === bodyTypeId
      );
      const selectedSkinTone = SKIN_TONES.find((t) => t.id === skinToneId);

      const height = computeHeight();

      const res = await fetch(`${API_BASE_URL}/ai/analyze-body-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          gender,
          bodyTypeId,
          bodyTypeName: selectedBodyType?.name,
          heightCm: height.cm,
          heightDisplay: height.display,
          skinToneId,
          skinToneLabel: selectedSkinTone?.label,
          imageBase64,
          mimeType: imageMimeType || "image/jpeg",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.log("❌ analyze-body-profile failed:", res.status, text);
        Alert.alert(
          "AI error",
          "We couldn't build your style profile right now. Please try again."
        );
        return;
      }

      const json = await res.json();

      const normalized: StyleProfile = {
        gender,
        bodyType: json.bodyType ?? selectedBodyType?.name ?? "Balanced",
        heightDisplay: json.heightDisplay ?? height.display,
        heightCm: json.heightCm ?? height.cm,
        skinToneCategory:
          json.skinToneCategory ?? selectedSkinTone?.label ?? "Unknown",
        undertone: json.undertone,
        palette: json.palette,
        dos: json.dos ?? [],
        donts: json.donts ?? [],
        bestSilhouettes: json.bestSilhouettes ?? [],
        trickyAreasTips: json.trickyAreasTips ?? [],
        createdAt: json.createdAt ?? new Date().toISOString(),
      };

      setProfile(normalized);

      // 👉 Instead of inline summary + alert, go to the dedicated result screen
      navigation.navigate("FindMyStyleResult", {
        profile: normalized,
      });
    } catch (err) {
      console.log("❌ Error in handleGenerateProfile:", err);
      Alert.alert(
        "AI error",
        "Something went wrong while generating your style profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {["Body shape", "Height", "Skin tone", "Photo"].map((label, index) => {
        const currentIndex = index + 1;
        const active = currentIndex === step;
        const done = currentIndex < step;

        return (
          <View key={label} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                done && styles.stepCircleDone,
                active && styles.stepCircleActive,
              ]}
            >
              <Text style={styles.stepCircleText}>
                {done ? "✓" : currentIndex}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                (active || done) && styles.stepLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderBodyTypeStep = () => {
    const list = getBodyTypesForGender();
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Step 1 · Body shape</Text>
        <Text style={styles.sectionTitle}>Choose the shape closest to you</Text>
        <Text style={styles.sectionBody}>
          Use the drawings and descriptions as a guide. It doesn&apos;t need to
          be 100% perfect &mdash; just pick the one that feels closest.
        </Text>

        {/* Gender toggle (placeholder until we store it in profile) */}
        <View style={styles.genderToggleRow}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === "male" && styles.genderButtonActive,
            ]}
            onPress={() => setGender("male")}
          >
            <Text
              style={[
                styles.genderButtonText,
                gender === "male" && styles.genderButtonTextActive,
              ]}
            >
              Mens
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === "female" && styles.genderButtonActive,
            ]}
            onPress={() => setGender("female")}
          >
            <Text
              style={[
                styles.genderButtonText,
                gender === "female" && styles.genderButtonTextActive,
              ]}
            >
              Womens
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardGrid}>
          {list.map((bt) => {
            const selected = bt.id === bodyTypeId;
            return (
              <TouchableOpacity
                key={bt.id}
                style={[
                  styles.bodyTypeCard,
                  selected && styles.bodyTypeCardSelected,
                ]}
                onPress={() => setBodyTypeId(bt.id)}
              >
                {/* Placeholder for silhouette drawing */}
                <View style={styles.silhouettePlaceholder}>
                  <Text style={styles.silhouetteText}>Silhouette</Text>
                </View>
                <Text style={styles.bodyTypeName}>{bt.name}</Text>
                <Text style={styles.bodyTypeDescription}>
                  {bt.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderHeightStep = () => {
    const height = computeHeight();
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Step 2 · Height</Text>
        <Text style={styles.sectionTitle}>Roughly how tall are you?</Text>
        <Text style={styles.sectionBody}>
          You can use either centimetres or feet and inches. It doesn&apos;t
          need to be exact &mdash; just close enough for proportions.
        </Text>

        <View style={styles.heightUnitRow}>
          <TouchableOpacity
            style={[
              styles.heightUnitButton,
              heightUnit === "ft" && styles.heightUnitButtonActive,
            ]}
            onPress={() => setHeightUnit("ft")}
          >
            <Text
              style={[
                styles.heightUnitText,
                heightUnit === "ft" && styles.heightUnitTextActive,
              ]}
            >
              ft/in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.heightUnitButton,
              heightUnit === "cm" && styles.heightUnitButtonActive,
            ]}
            onPress={() => setHeightUnit("cm")}
          >
            <Text
              style={[
                styles.heightUnitText,
                heightUnit === "cm" && styles.heightUnitTextActive,
              ]}
            >
              cm
            </Text>
          </TouchableOpacity>
        </View>

        {heightUnit === "cm" ? (
          <View style={styles.heightInputsRow}>
            <View style={styles.heightInputWrapper}>
              <Text style={styles.inputLabel}>Height in cm</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 178"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={heightCm}
                onChangeText={setHeightCm}
              />
            </View>
          </View>
        ) : (
          <View style={styles.heightInputsRow}>
            <View style={styles.heightInputWrapper}>
              <Text style={styles.inputLabel}>Feet</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 5"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={heightFt}
                onChangeText={setHeightFt}
              />
            </View>
            <View style={styles.heightInputWrapper}>
              <Text style={styles.inputLabel}>Inches</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 10"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={heightIn}
                onChangeText={setHeightIn}
              />
            </View>
          </View>
        )}

        {height.display ? (
          <Text style={styles.heightPreview}>
            We&apos;ll use:{" "}
            <Text style={styles.heightPreviewStrong}>{height.display}</Text>
          </Text>
        ) : null}
      </View>
    );
  };

  const renderSkinToneStep = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Step 3 · Skin tone</Text>
        <Text style={styles.sectionTitle}>Pick the closest match</Text>
        <Text style={styles.sectionBody}>
          Think about how your skin looks in natural daylight. We&apos;ll use
          this to build a color palette that flatters you.
        </Text>

        <View style={styles.cardGrid}>
          {SKIN_TONES.map((tone) => {
            const selected = tone.id === skinToneId;
            return (
              <TouchableOpacity
                key={tone.id}
                style={[
                  styles.skinToneCard,
                  selected && styles.skinToneCardSelected,
                ]}
                onPress={() => setSkinToneId(tone.id)}
              >
                {/* Placeholder color swatch */}
                <View style={styles.skinSwatch} />
                <Text style={styles.skinToneLabel}>{tone.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPhotoStep = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Step 4 · Full-body photo</Text>
        <Text style={styles.sectionTitle}>Upload a recent picture</Text>
        <Text style={styles.sectionBody}>
          Stand on a flat surface in good light. A simple outfit is fine. This
          helps the stylist understand your proportions, not your weight.
        </Text>

        <View style={styles.photoCard}>
          <Image
            source={{ uri: imageUri ?? FALLBACK_IMAGE }}
            style={styles.photoImage}
            resizeMode="cover"
          />
          <Text style={styles.photoCaption}>
            {imageUri
              ? "Your selected full-body picture."
              : "Placeholder image. Once you upload, your real photo shows here."}
          </Text>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={handlePickImage}
          >
            <Text style={styles.outlineButtonText}>
              {imageUri ? "Change photo" : "Choose photo"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 16 }]}
          onPress={handleGenerateProfile}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting
              ? "Building your style blueprint…"
              : "Generate my style blueprint"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProfileSummary = () => {
    if (!profile) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Your style blueprint</Text>
        <Text style={styles.sectionTitle}>Saved analysis (v1)</Text>
        <Text style={styles.sectionBody}>
          This will later power suggestions for eastern, western, party and
          casual outfits based on your body type and palette.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Body type: </Text>
            {profile.bodyType}
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Height: </Text>
            {profile.heightDisplay}
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Skin tone: </Text>
            {profile.skinToneCategory}
          </Text>

          {profile.dos && profile.dos.length > 0 && (
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryHeading}>Do&apos;s</Text>
              {profile.dos.map((d, idx) => (
                <Text key={idx} style={styles.summaryBullet}>
                  • {d}
                </Text>
              ))}
            </View>
          )}

          {profile.donts && profile.donts.length > 0 && (
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryHeading}>Don&apos;ts</Text>
              {profile.donts.map((d, idx) => (
                <Text key={idx} style={styles.summaryBullet}>
                  • {d}
                </Text>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.summaryHint}>
          Later, we&apos;ll attach outfit ideas for eastern, western, party and
          casual settings on top of this profile.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      {/* Background blobs */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobPink} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Find my style</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.betaTag}>Prototype · Saved analysis</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}

        {step === 1 && renderBodyTypeStep()}
        {step === 2 && renderHeightStep()}
        {step === 3 && renderSkinToneStep()}
        {step === 4 && renderPhotoStep()}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.subtleButton} onPress={goBack}>
            <Text style={styles.subtleButtonText}>
              {step === 1 ? "Cancel" : "Back"}
            </Text>
          </TouchableOpacity>

          {step < 4 && (
            <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inline summary still available for now (optional) */}
        {renderProfileSummary()}
      </ScrollView>

      {/* 🔮 Analyzing overlay (same vibe as outfit analysis) */}
      {submitting && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <View style={styles.analyzingIconCircle}>
              <ActivityIndicator size="large" color="#A5B4FC" />
            </View>
            <Text style={styles.analyzingTitle}>
              Analyzing your style profile…
            </Text>
            <Text style={styles.analyzingBody}>
              We&apos;re combining your body shape, height and skin tone to
              build a personal style blueprint you can reuse for every outfit.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default FindMyStyleScreen;

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
    top: -60,
    right: -40,
    width: 260,
    height: 260,
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
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
    fontWeight: "600",
    color: "#111827",
  },
  topRight: {},
  betaTag: {
    fontSize: 11,
    color: "#A5B4FC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.6)",
    backgroundColor: "rgba(79,70,229,0.15)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 18,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  stepCircleActive: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(79,70,229,0.2)",
  },
  stepCircleDone: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(22,163,74,0.25)",
  },
  stepCircleText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  stepLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  stepLabelActive: {
    color: "#E5E7EB",
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.08,
    textTransform: "uppercase",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    marginBottom: 10,
  },
  genderToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  genderButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  genderButtonActive: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(79,70,229,0.25)",
  },
  genderButtonText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  genderButtonTextActive: {
    color: "#E5E7EB",
    fontWeight: "600",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bodyTypeCard: {
    flexBasis: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  bodyTypeCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  silhouettePlaceholder: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4B5563",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  silhouetteText: {
    fontSize: 11,
    color: "#6B7280",
  },
  bodyTypeName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  bodyTypeDescription: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  heightUnitRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  heightUnitButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 7,
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  heightUnitButtonActive: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(79,70,229,0.25)",
  },
  heightUnitText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  heightUnitTextActive: {
    color: "#E5E7EB",
    fontWeight: "600",
  },
  heightInputsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  heightInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#F9FAFB",
    backgroundColor: "rgba(15,23,42,0.96)",
  },
  heightPreview: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  heightPreviewStrong: {
    color: "#E5E7EB",
    fontWeight: "600",
  },
  skinToneCard: {
    flexBasis: "48%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  skinToneCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(79,70,229,0.25)",
  },
  skinSwatch: {
    width: "100%",
    height: 40,
    borderRadius: 10,
    backgroundColor: "#6B7280", // placeholder color
    marginBottom: 6,
  },
  skinToneLabel: {
    fontSize: 12,
    color: "#111827",
  },
  photoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    padding: 12,
    backgroundColor: "rgba(15,23,42,0.96)",
  },
  photoImage: {
    width: "100%",
    height: 260,
    borderRadius: 14,
    marginBottom: 8,
  },
  photoCaption: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "transparent",
    alignSelf: "flex-start",
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#E5E7EB",
  },
  subtleButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  subtleButtonText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 4,
  },
  summaryCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  summaryLine: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 2,
  },
  summaryLabel: {
    fontWeight: "600",
  },
  summaryBlock: {
    marginTop: 8,
  },
  summaryHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  summaryBullet: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  summaryHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingCard: {
    width: "78%",
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.5)",
  },
  analyzingIconCircle: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  analyzingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F9FAFB",
    textAlign: "center",
    marginBottom: 6,
  },
  analyzingBody: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
});
