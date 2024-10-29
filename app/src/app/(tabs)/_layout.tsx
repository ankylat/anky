import { Tabs } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { TabBarIcon } from "@/src/components/navigation/TabBarIcon";
import { Colors } from "@/src/constants/Colors";
import { useColorScheme } from "@/src/hooks/useColorScheme";
import WritingGame from "@/src/components/WritingGame";
import { useAnky } from "@/src/context/AnkyContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useLoginWithFarcaster, usePrivy } from "@privy-io/expo";

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
  console.log("state", state);
  const colorScheme = useColorScheme();
  const { isWriteModalVisible, setIsWriteModalVisible } = useAnky();
  const [showWritingGame, setShowWritingGame] = useState(false);

  const handleProfilePress = () => {
    console.log("user", user);
    if (!user) {
      console.log("logging in with farcaster");
      loginWithFarcaster({ relyingParty: "https://www.anky.bot" });
    }
  };

  return (
    <>
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
              setIsWriteModalVisible(true);
              setShowWritingGame(true);
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
      {showWritingGame && isWriteModalVisible && (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 1000 }}>
          <WritingGame
            onClose={() => {
              setShowWritingGame(false);
              setIsWriteModalVisible(false);
            }}
          />
        </View>
      )}
    </>
  );
}
