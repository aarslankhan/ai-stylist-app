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
import FindMyStyleScreen from "./app/FindMyStyleScreen";
import FindMyStyleResultScreen from "./app/FindMyStyleResultScreen";

// 🔥 New Today’s Outfit screens
import TodaysOutfitOccasionScreen from "./app/TodaysOutfitOccasionScreen";
import TodaysOutfitBuilderScreen from "./app/TodaysOutfitBuilderScreen";
import TodaysOutfitResultScreen from "./app/TodaysOutfitResultScreen";
import { StyleProfileResult } from "./services/styleProfileApi";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;

  UploadOutfit: { prefillLook?: any } | undefined;
  Wardrobe: undefined;
  LookDetail: { id: string };

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

  // FMS
  FindMyStyle: undefined;
  FindMyStyleResult: {
    profile: any;
  };

  // Today’s Outfit flow
  TodaysOutfitOccasion: undefined;
  TodaysOutfitBuilder: {
    occasionId: string;
    occasionLabel: string;
    styleProfile: StyleProfileResult;
  };
  TodaysOutfitResult: {
    occasionId: string;
    occasionLabel: string;
    result: any;
  };
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

          {/* FMS */}
          <Stack.Screen name="FindMyStyle" component={FindMyStyleScreen} />
          <Stack.Screen
            name="FindMyStyleResult"
            component={FindMyStyleResultScreen}
          />

          {/* Today’s Outfit flow */}
          <Stack.Screen
            name="TodaysOutfitOccasion"
            component={TodaysOutfitOccasionScreen}
          />
          <Stack.Screen
            name="TodaysOutfitBuilder"
            component={TodaysOutfitBuilderScreen}
          />
          <Stack.Screen
            name="TodaysOutfitResult"
            component={TodaysOutfitResultScreen}
          />
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
