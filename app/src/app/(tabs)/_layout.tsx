import { router, Tabs } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  Image,
} from "react-native";

import { TabBarIcon } from "@/src/components/navigation/TabBarIcon";
import { Colors } from "@/src/constants/Colors";
import { useColorScheme } from "@/src/hooks/useColorScheme";
import WritingGame from "@/src/components/Writing_Game";
import { useAnky } from "@/src/context/AnkyContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useLoginWithFarcaster, usePrivy } from "@privy-io/expo";
import { WritingSession } from "@/src/types/Anky";
import { getCurrentAnkyverseDay } from "../lib/ankyverse";
import ProfileIcon from "@/assets/icons/profile.svg";
import PouchIcon from "@/assets/icons/pouch.svg";
import Playground from "@/assets/icons/playground.svg";
import Scroll from "@/assets/icons/scroll.svg";
import CreateAccountModal from "@/src/components/Profile/CreateAccountModal";
import { useUser } from "@/src/context/UserContext";
import Animated, { FadeIn } from "react-native-reanimated";

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
  const {
    isWritingGameVisible,
    setIsWritingGameVisible,
    didUserWriteToday,
    isUserWriting,
  } = useAnky();
  const { createAccountModalVisible, setCreateAccountModalVisible } = useUser();

  const [writingSession, setWritingSession] = useState<
    WritingSession | undefined
  >(undefined);

  const ankyverseDay = getCurrentAnkyverseDay();

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
          tabBarStyle: {
            backgroundColor: "#1a1f3d",
            borderTopWidth: 2,
            borderTopColor: "#ff6b00",
            height: 90,
            position: "relative",
          },
          header: ({ route, options }: { route: any; options: any }) => {
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
          name="feed"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Scroll
                width={88}
                height={88}
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                  marginTop: 33,
                }}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="anky"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Playground
                width={111}
                height={111}
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                  marginTop: 20,
                }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="write"
          options={{
            headerShown: false,
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
          name="wallet"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <PouchIcon
                width={111}
                height={111}
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <ProfileIcon
                width={111}
                height={111}
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                  marginTop: 33,
                }}
              />
            ),
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
          <WritingGame />
        </View>
      )}

      {true && (
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
          <AnimatedTouchable
            entering={FadeIn.duration(1618)}
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
              setIsWritingGameVisible(!isWritingGameVisible);
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
          </AnimatedTouchable>
        </View>
      )}
      <CreateAccountModal
        isVisible={createAccountModalVisible}
        onClose={() => setCreateAccountModalVisible(false)}
      />
    </View>
  );
}
