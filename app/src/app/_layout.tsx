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
import { PrivyProvider } from "@privy-io/expo";
import { AnkyProvider, useAnky } from "../context/AnkyContext";
import { UserProvider } from "../context/UserContext";
import { Pressable, Text, View } from "react-native";
import AnkyButton from "../components/AnkyButton";


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
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <View style={{ flex: 1 }}>

              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <AnkyButton />
            </View>
          </ThemeProvider>

        </UserProvider>
      </AnkyProvider>
    </PrivyProvider>
  );
}
