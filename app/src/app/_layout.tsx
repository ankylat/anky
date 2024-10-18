import "fast-text-encoding";
import "react-native-get-random-values";
import "@ethersproject/shims";

// Your root component
import "../../global.css";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { View } from "react-native";

import { useColorScheme } from "@/src/hooks/useColorScheme";

// Contexts
import { PrivyProvider, PrivyElements } from "@privy-io/expo";
import { AnkyProvider } from "@/src/context/AnkyContext";
import { UserProvider } from "@/src/context/UserContext";
import { AuthProvider } from "@/src/context/AuthContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require("@/assets/fonts/Righteous-Regular.ttf"),
  });

  useEffect(() => {
    if (error) console.error("Error loading fonts:", error);
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <PrivyProvider
      appId={Constants.expoConfig?.extra?.privyAppId}
      clientId={Constants.expoConfig?.extra?.privyClientId}
    >
      <AnkyProvider>
        <UserProvider>
          <AuthProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <PrivyElements />
            </ThemeProvider>
          </AuthProvider>
        </UserProvider>
      </AnkyProvider>
    </PrivyProvider>
  );
}
