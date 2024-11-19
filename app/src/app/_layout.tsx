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
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SheetProvider } from "react-native-actions-sheet";

import { useColorScheme } from "@/src/hooks/useColorScheme";

// Contexts
import { SmartWalletsProvider } from "@privy-io/expo/smart-wallets";
import { PrivyProvider } from "@privy-io/expo";
import { AnkyProvider } from "../context/AnkyContext";
import { UserProvider } from "../context/UserContext";
import { NetworkProvider } from "../context/NetworkContext";
import { View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { clearAllUserDataFromLocalStorage } from "./lib/development";

import { base, baseGoerli, optimism } from "viem/chains";

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
      // clearAllUserDataFromLocalStorage();
    }
  }, [loaded]);

  const [showWritingGame, setShowWritingGame] = useState(true);

  if (!loaded) {
    return null;
  }

  return (
    <NetworkProvider>
      <PrivyProvider
        appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID!}
        clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID!}
        supportedChains={[optimism, base, baseGoerli]}
      >
        <SmartWalletsProvider>
          <QueryClientProvider client={queryClient}>
            <SheetProvider>
              <UserProvider>
                <AnkyProvider>
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
                          name="+not-found"
                          options={{ headerShown: false }}
                        />
                      </Stack>
                    </View>
                  </ThemeProvider>
                </AnkyProvider>
              </UserProvider>
            </SheetProvider>
          </QueryClientProvider>
        </SmartWalletsProvider>
      </PrivyProvider>
    </NetworkProvider>
  );
}
