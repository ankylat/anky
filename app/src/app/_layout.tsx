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
import { Animated, Easing } from "react-native";

import { useColorScheme } from "@/src/hooks/useColorScheme";

// Contexts
import { PrivyProvider } from "@privy-io/expo";
import { AnkyProvider, useAnky } from "../context/AnkyContext";
import { UserProvider } from "../context/UserContext";
import { Pressable, Text, View, TouchableOpacity } from "react-native";
import AnkyButton from "../components/AnkyButton";
import WritingGame from "../components/WritingGame";
import CustomTabBar from "../components/navigation/CustomTabBar";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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

  if (!loaded) {
    return null;
  }

  const toggleWritingGame = () => {
    setShowWritingGame(!showWritingGame);
  };

  const spin = buttonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <PrivyProvider
      appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID!}
    >
      <SheetProvider>
        <AnkyProvider>
          <UserProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <View style={{ flex: 1 }}>
                {showWritingGame ? (
                  <WritingGame
                    onGameOver={(wordsWritten, timeSpent) => {
                      console.log(
                        `Words written: ${wordsWritten}, Time spent: ${timeSpent}`
                      );
                      // Process the writing game results
                      console.log(
                        `Processing writing game results: ${wordsWritten} words written in ${timeSpent} seconds`
                      );
                      // TODO: Add logic to handle the writing game results (e.g., save to storage, update user stats)

                      // After processing, toggle the writing game view
                      // toggleWritingGame();
                    }}
                    sessionSeconds={8}
                    modes={{
                      up: {
                        prompt: "What's on your mind right now?",
                        color: "#4a148c",
                      },
                      right: {
                        prompt: "Describe a recent challenge you overcame",
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
                ) : (
                  <>
                    <Stack>
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                  </>
                )}
                <View
                  style={{
                    position: "absolute",
                    bottom: 36,
                    left: 0,
                    right: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "box-none",
                  }}
                >
                  <TouchableOpacity
                    className="bg-purple-500 rounded-full p-4"
                    onPress={toggleWritingGame}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                      elevation: 5,
                    }}
                  >
                    <Text className="text-xl text-white text-center">👽</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ThemeProvider>
          </UserProvider>
        </AnkyProvider>
      </SheetProvider>
    </PrivyProvider>
  );
}
