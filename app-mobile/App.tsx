// App.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LooksProvider } from "./context/LooksContext";

import LoginScreen from "./app/login";
import HomeScreen from "./app/home";
import UploadOutfitScreen from "./app/UploadOutfitScreen";
import WardrobeScreen from "./app/WardrobeScreen";
import LookDetailScreen from "./app/LookDetailScreen";
import ProfileScreen from "./app/ProfileScreen";
import ShareCardScreen from "./app/ShareCardScreen";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  UploadOutfit: { prefillLook?: any } | undefined;
  Wardrobe: undefined;
  LookDetail: { id: string };

  // 👇 ShareCard can be opened either with an existing look id
  // OR directly from UploadOutfit with fresh AI + imageUri
  ShareCard: {
    id?: string;
    ai?: {
      score: number;
      vibe: string;
      tags: string[];
      notes: string[];
    };
    imageUri?: string | null;
  };

  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#020617",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 12, color: "#9CA3AF", fontSize: 13 }}>
          Getting your wardrobe ready…
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="UploadOutfit" component={UploadOutfitScreen} />
          <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
          <Stack.Screen name="LookDetail" component={LookDetailScreen} />
          <Stack.Screen name="ShareCard" component={ShareCardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LooksProvider>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: "#020617" }}
            edges={["top", "bottom"]}
          >
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaView>
        </LooksProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
