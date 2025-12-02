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
  const navigation = useNavigation<any>();
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
        error?.message ?? "Please check your current password and try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <View style={styles.page}>
      <View style={styles.bgBlobPurple} />
      <View style={styles.bgBlobTeal} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={styles.topLeft}>
                <TouchableOpacity onPress={handleBack}>
                  <Text style={styles.backText}>← Home</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Profile & settings</Text>
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account</Text>
              <Text style={styles.cardSubtitle}>
                Update how AI Stylist greets you and manage your password.
              </Text>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.readonlyInput}>
                  <Text style={styles.readonlyText}>
                    {user?.email ?? "No email"}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                  autoCapitalize="words"
                />
                <Text style={styles.helperText}>
                  This is the name shown in your greeting on the Home screen.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSaveName}
                  disabled={savingName}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryButtonText}>
                    {savingName ? "Saving..." : "Save name"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Change password</Text>

                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                  secureTextEntry
                />

                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#6B7280"
                  style={styles.input}
                  secureTextEntry
                />

                <Text style={styles.helperText}>
                  For security reasons you&apos;ll need your current password
                  before choosing a new one.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 4 }]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryButtonText}>
                    {changingPassword ? "Updating..." : "Update password"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Danger zone */}
              <View style={styles.dangerRow}>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={handleSignOut}
                  activeOpacity={0.9}
                >
                  <Text style={styles.outlineButtonText}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  readonlyInput: {
    backgroundColor: "#020617",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: {
    fontSize: 13,
    color: "#E5E7EB",
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#6366F1",
  },
  primaryButtonText: {
    fontSize: 13,
    color: "#F9FAFB",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#111827",
    marginVertical: 8,
    opacity: 0.7,
  },
  dangerRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  outlineButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  outlineButtonText: {
    fontSize: 13,
    color: "#F97373",
  },
});
