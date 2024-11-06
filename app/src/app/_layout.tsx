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

import { useColorScheme } from "@/src/hooks/useColorScheme";

// Contexts
import { PrivyProvider } from "@privy-io/expo";
import { AnkyProvider } from "../context/AnkyContext";
import { UserProvider } from "../context/UserContext";
import { View } from "react-native";
import { QuilibriumProvider } from "../context/QuilibriumContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global objects

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    Righteous: require("@/assets/fonts/Righteous-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const [showWritingGame, setShowWritingGame] = useState(true);

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
