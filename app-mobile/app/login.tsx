// app-mobile/app/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 900; // tweak breakpoint if you want

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
      // No manual navigation: RootNavigator will switch to Home when user changes
    } catch (err: any) {
      console.log("Auth error:", err);
      // Show nicer messages for common errors
      const raw = err?.code || err?.message || "";
      if (raw.includes("auth/user-not-found")) {
        setError("No account found with that email.");
      } else if (raw.includes("auth/wrong-password")) {
        setError("Incorrect password. Try again.");
      } else if (raw.includes("auth/email-already-in-use")) {
        setError("This email is already in use.");
      } else if (raw.includes("auth/weak-password")) {
        setError("Password should be at least 6 characters.");
      } else if (raw.includes("auth/operation-not-allowed")) {
        setError("Email/password sign-in is not enabled in Firebase settings.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.contentWrapper,
          isLargeScreen ? styles.rowLayout : styles.columnLayout,
        ]}
      >
        {/* LEFT SIDE - hero image / video / branding */}
        <View
          style={[
            styles.hero,
            isLargeScreen ? styles.heroLarge : styles.heroSmall,
          ]}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroBadge}>AI Styling Companion</Text>
            <Text style={styles.heroTitle}>Outfits, but smarter.</Text>
            <Text style={styles.heroSubtitle}>
              Upload your fits, get instant AI-powered styling tips, outfit
              ratings, and personalized lookbooks. All in one place.
            </Text>
            <Text style={styles.heroFootnote}>
              Coming soon: auto-generated “what to wear today” based on your
              wardrobe.
            </Text>
          </View>
        </View>

        {/* RIGHT SIDE - auth card */}
        <View style={styles.authWrapper}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Sign in to your AI Stylist account"
                : "Create an account to start styling smarter"}
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() =>
                setMode((prev) => (prev === "login" ? "signup" : "login"))
              }
            >
              <Text style={styles.switchModeText}>
                {mode === "login"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              By continuing, you agree to our{" "}
              <Text style={styles.link}>Terms</Text> &{" "}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#020617", // slate-950
  },
  contentWrapper: {
    flex: 1,
  },
  rowLayout: {
    flexDirection: "row",
  },
  columnLayout: {
    flexDirection: "column",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
  },
  heroLarge: {
    flex: 1.3,
  },
  heroSmall: {
    height: 220,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    justifyContent: "center",
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    color: "#E5E7EB",
    fontSize: 11,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#CBD5F5",
    marginBottom: 12,
    maxWidth: 420,
  },
  heroFootnote: {
    fontSize: 12,
    color: "#9CA3AF",
    maxWidth: 360,
  },
  authWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1F2937",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  error: {
    fontSize: 13,
    color: "#F97373",
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: "#D1D5DB",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#F9FAFB",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#6366F1",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  switchModeButton: {
    marginTop: 16,
  },
  switchModeText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  footerText: {
    marginTop: 16,
    fontSize: 11,
    color: "#6B7280",
  },
  link: {
    color: "#A855F7",
  },
});
