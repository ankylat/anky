import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Modal, View, Text, Button } from "react-native";

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
  const { loginWithFarcaster } = useLoginWithFarcaster();
  const colorScheme = useColorScheme();
  const { isWriteModalVisible, setIsWriteModalVisible } = useAnky();

  const handleProfilePress = () => {
    if (!user) {
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
            title: "Write",
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
            },
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "mail" : "mail-outline"}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "person" : "person-outline"}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!user) {
                e.preventDefault();
                handleProfilePress();
              }
            },
          }}
        />
      </Tabs>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isWriteModalVisible}
        onRequestClose={() => setIsWriteModalVisible(false)}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <WritingGame />
        </View>
      </Modal>
    </>
  );
}
