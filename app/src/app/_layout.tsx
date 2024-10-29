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
  const [writingSession, setWritingSession] = useState<
    WritingSession | undefined
  >(undefined);
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

                    {showWritingGame && (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 10,
                        }}
                      >
                        <WritingGame
                          onGameOver={(wordsWritten, timeSpent) => {
                            console.log(
                              `Words written: ${wordsWritten}, Time spent: ${timeSpent}`
                            );
                            console.log(
                              `Processing writing game results: ${wordsWritten} words written in ${timeSpent} seconds`
                            );
                          }}
                          writingSession={writingSession}
                          setWritingSession={setWritingSession}
                          sessionSeconds={8}
                          sessionTargetSeconds={480}
                          ankyverseDay={ankyverseDay}
                          modes={{
                            up: {
                              prompt: "What's on your mind right now?",
                              color: ankyverseDay.currentColor.secondary,
                            },
                            right: {
                              prompt:
                                "Describe a recent challenge you overcame",
                              color: "#1a237e",
                            },
                            down: {
                              prompt: "What are you grateful for today?",
                              color: "#004d40",
                            },
                            left: {
                              prompt: "Write about a goal you want to achieve",
                              color: "#b71c1c",
                            },
                          }}
                        />
                      </View>
                    )}

                    <View
                      style={{
                        position: "absolute",
                        bottom: 33,
                        left: 0,
                        right: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "box-none",
                        zIndex: 100,
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          backgroundColor: ankyverseDay.currentColor.secondary,
                          borderRadius: 9999,
                          padding: 16,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 3.84,
                          elevation: 5,
                        }}
                        onPress={() => {
                          Vibration.vibrate(5);
                          setShowWritingGame((x) => !x);
                        }}
                        activeOpacity={0.9}
                      >
                        <Text
                          style={{
                            fontSize: 24,
                            color: "white",
                            textAlign: "center",
                          }}
                        >
                          👽
                        </Text>
                      </TouchableOpacity>
                    </View>
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
