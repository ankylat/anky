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
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SheetProvider } from "react-native-actions-sheet";
import { Animated, Easing, Vibration } from "react-native";

import { useColorScheme } from "@/src/hooks/useColorScheme";

// Contexts
import { PrivyProvider } from "@privy-io/expo";
import { AnkyProvider, useAnky } from "../context/AnkyContext";
import { UserProvider } from "../context/UserContext";
import { Pressable, Text, View, TouchableOpacity } from "react-native";
import AnkyButton from "../components/AnkyButton";
import WritingGame from "../components/WritingGame";
import CustomTabBar from "../components/navigation/CustomTabBar";
import { getCurrentAnkyverseDay } from "./lib/ankyverse";
import { QuilibriumProvider } from "../context/QuilibriumContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Ankito from "@/assets/icons/ankito.svg";
import { Cloudinary } from "@cloudinary/url-gen";
import { WritingSession } from "../types/Anky";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global objects

const queryClient = new QueryClient();

const cld = new Cloudinary({
  cloud: {
    cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require("@/assets/fonts/Righteous-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const [showWritingGame, setShowWritingGame] = useState(true);
  const [buttonRotation] = useState(new Animated.Value(0));
  const [buttonScale] = useState(new Animated.Value(1));
  const [writingSession, setWritingSession] = useState<
    WritingSession | undefined
  >(undefined);

  const ankyverseDay = getCurrentAnkyverseDay();
  console.log("IN HERE, the ankyverse day is", ankyverseDay);

  if (!loaded) {
    return null;
  }

  const toggleWritingGame = () => {
    setShowWritingGame(!showWritingGame);
  };

  return (
    <PrivyProvider
      appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID!}
    >
      <QuilibriumProvider>
        <QueryClientProvider client={queryClient}>
          <SheetProvider>
            <AnkyProvider>
              <UserProvider>
                <ThemeProvider
                  value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                >
                  <View style={{ flex: 1 }}>
                    <Stack>
                      <Stack.Screen
                        name="index"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />

                      <Stack.Screen
                        name="cast/[hash]"
                        options={{
                          presentation: "modal",
                          animation: "slide_from_bottom",
                          headerShown: false,
                          headerShadowVisible: false,
                          contentStyle: { marginTop: 0 },
                        }}
                      />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                  </View>
                </ThemeProvider>
              </UserProvider>
            </AnkyProvider>
          </SheetProvider>
        </QueryClientProvider>
      </QuilibriumProvider>
    </PrivyProvider>
  );
}
