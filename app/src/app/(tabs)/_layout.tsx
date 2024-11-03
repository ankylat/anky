import { Tabs } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

import { TabBarIcon } from "@/src/components/navigation/TabBarIcon";
import { Colors } from "@/src/constants/Colors";
import { useColorScheme } from "@/src/hooks/useColorScheme";
import WritingGame from "@/src/components/WritingGame";
import { useAnky } from "@/src/context/AnkyContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useLoginWithFarcaster, usePrivy } from "@privy-io/expo";
import { WritingSession } from "@/src/types/Anky";
import { getCurrentAnkyverseDay } from "../lib/ankyverse";
import ProfileScreen from "./profile";

export default function TabLayout() {
  const { user } = usePrivy();
  console.log("inside the tab layout the user is", user);
  const { loginWithFarcaster, state } = useLoginWithFarcaster({
    onSuccess: (user, isNewUser) => {
      console.log("User logged in:", user);
      console.log("Is new user:", isNewUser);
    },
    onError: (error) => {
      console.log("Error logging in with farcaster:", error);
    },
  });
  const colorScheme = useColorScheme();
  const { isWritingGameVisible, setIsWritingGameVisible } = useAnky();
  const [writingSession, setWritingSession] = useState<
    WritingSession | undefined
  >(undefined);

  const ankyverseDay = getCurrentAnkyverseDay();

  const handleProfilePress = () => {
    console.log("user", user);
    if (!user) {
      console.log("logging in with farcaster");
      loginWithFarcaster({ relyingParty: "https://www.anky.bot" });
    }
  };

  return (
    <View className="flex-1 w-full bg-white relative">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          header: ({ route, options }) => {
            return (
              <Header
                title={options.title || route.name}
                headerStyle={{
                  backgroundColor: Colors[colorScheme ?? "light"].background,
                }}
                headerTintColor={Colors[colorScheme ?? "light"].text}
              />
            );
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "home" : "home-outline"}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="anky"
          options={{
            title: "Playground",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons name="alien" size={24} color="black" />
            ),
          }}
        />
        <Tabs.Screen
          name="write"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "pencil" : "pencil-outline"}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setIsWritingGameVisible(true);
            },
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "map" : "map-outline"}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "person" : "person-outline"}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="u/[fid]"
          options={{
            tabBarButton: (props) => null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="transactions/[fid]"
          options={{
            tabBarButton: (props) => null,
            title: "$newen transactions",
          }}
        />
      </Tabs>

      {isWritingGameVisible && (
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
            secondsBetweenKeystrokes={8}
            ankyverseDay={ankyverseDay}
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
          zIndex: 1000,
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
            setIsWritingGameVisible((x) => !x);
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
  );
}
