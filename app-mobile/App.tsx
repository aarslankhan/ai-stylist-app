// App.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text } from "react-native";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { LooksProvider } from "./context/LooksContext";

import LoginScreen from "./app/login";
import HomeScreen from "./app/home";
import UploadOutfitScreen from "./app/UploadOutfitScreen";
import WardrobeScreen from "./app/WardrobeScreen";
import LookDetailScreen from "./app/LookDetailScreen";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  UploadOutfit: undefined;
  Wardrobe: undefined;
  LookDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
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
        <ActivityIndicator size="large" />
        <Text style={{ color: "#e5e7eb", marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="UploadOutfit" component={UploadOutfitScreen} />
          <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
          <Stack.Screen name="LookDetail" component={LookDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LooksProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </LooksProvider>
    </AuthProvider>
  );
}
