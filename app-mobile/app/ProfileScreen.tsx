// app-mobile/app/ProfileScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, updateDisplayName, changePassword, signOutUser } = useAuth();

  const initialName =
    (user?.displayName && user.displayName.trim()) ||
    getFirstNameFromEmail(user?.email ?? "");

  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a name.");
      return;
    }
    try {
      setSavingName(true);
      await updateDisplayName(trimmed);
      Alert.alert("Updated", "Your name has been updated.");
    } catch (error: any) {
      console.log("ProfileScreen.updateName error", error);
      Alert.alert(
        "Could not update name",
        error?.message ?? "Please try again."
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert(
        "Missing fields",
        "Please enter both your current and new password."
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        "Password too short",
        "Your new password should be at least 6 characters."
      );
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (error: any) {
      console.log("ProfileScreen.changePassword error", error);
      Alert.alert(
        "Could not change password",
        error?.message ??
          "Please check your current password and try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* background blobs to match rest of app */}
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobTeal} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.topLeft}
              activeOpacity={0.7}
            >
              <Text style={styles.backText}>← Home</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Profile & settings</Text>
          </View>

          {/* Account card */}
          <View style={[styles.card, { marginBottom: 16 }]}>
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.cardSubtitle}>
              Update how AI Stylist greets you and manage your password.
            </Text>

            {/* Email (readonly) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyText}>
                  {user?.email ?? "No email"}
                </Text>
              </View>
            </View>

            {/* Display name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#4B5563"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Text style={styles.helperText}>
                This is the name shown in your greeting on the Home screen.
              </Text>

              <TouchableOpacity
                onPress={handleSaveName}
                style={styles.primaryButton}
                activeOpacity={0.8}
                disabled={savingName}
              >
                <Text style={styles.primaryButtonText}>
                  {savingName ? "Saving..." : "Save name"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Change password</Text>
              <Text style={styles.helperText}>
                For security reasons you&apos;ll need your current password
                before choosing a new one.
              </Text>

              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Current password"
                placeholderTextColor="#4B5563"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="New password"
                placeholderTextColor="#4B5563"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <TouchableOpacity
                onPress={handleChangePassword}
                style={styles.primaryButton}
                activeOpacity={0.8}
                disabled={changingPassword}
              >
                <Text style={styles.primaryButtonText}>
                  {changingPassword ? "Updating..." : "Update password"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Danger zone */}
            <View style={styles.dangerRow}>
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.outlineButton}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 🔹 NOTE: personal style / body analysis card was here before.
              It’s now intentionally removed so body analysis only lives on
              the dedicated “My saved body analysis” flow. */}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getFirstNameFromEmail = (email: string): string => {
  if (!email) return "Stylist";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Stylist";
  const first = cleaned.split(" ")[0];
  if (!first) return "Stylist";
  return first.charAt(0).toUpperCase() + first.slice(1);
};

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
  },
  bgBlobTeal: {
    position: "absolute",
    top: -40,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(45,212,191,0.3)",
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
    gap: 10,
  },
  backText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
    marginTop: 8,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "#111827",
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#F9FAFB",
    backgroundColor: "#020617",
  },
  readonlyInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  readonlyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  helperText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: "#6366F1",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  divider: {
    height: 1,
    backgroundColor: "#111827",
    marginVertical: 12,
  },
  dangerRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  outlineButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#E5E7EB",
  },
});
