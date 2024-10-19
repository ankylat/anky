import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Modal, View, Text, Button } from "react-native";
import { RouteProp } from "@react-navigation/native";

import { TabBarIcon } from "@/src/components/navigation/TabBarIcon";
import { Colors } from "@/src/constants/Colors";
import { useColorScheme } from "@/src/hooks/useColorScheme";
import WritingGame from "@/src/components/WritingGame";
import { useAnky } from "@/src/context/AnkyContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { usePrivy, User } from "@privy-io/expo";
import { useLoginWithPasskey } from "@privy-io/expo/passkey";

export default function TabLayout() {
  const { user } = usePrivy();
  const { state, loginWithPasskey } = useLoginWithPasskey({
    onSuccess(user, isNewUser) {
      console.log("user logged in with passkey", user);
      console.log("IS NEW USER", isNewUser);
    },
    onError(error: Error) {
      console.log("error logging in with passkey", error);
    },
  });
  const colorScheme = useColorScheme();
  const { isWriteModalVisible, setIsWriteModalVisible } = useAnky();

  const handleProfilePress = async () => {
    console.log("IN HERE21321, THE USER IS", user);
    console.log("the login with farcaster is", loginWithPasskey);
    if (!user) {
      alert("logging in with passkey on privy");
      const passkeyLoginResponse = await loginWithPasskey({
        relyingParty: "https://www.anky.bot",
      });
      console.log("the passkey login response is", passkeyLoginResponse);
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          header: ({
            route,
            options,
          }: {
            route: RouteProp<any, string>;
            options: any;
          }) => {
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
            tabBarIcon: ({
              color,
              focused,
            }: {
              color: string;
              focused: boolean;
            }) => (
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
            tabBarIcon: ({
              color,
              focused,
            }: {
              color: string;
              focused: boolean;
            }) => (
              <MaterialCommunityIcons name="alien" size={24} color="black" />
            ),
          }}
        />
        <Tabs.Screen
          name="write"
          options={{
            title: "Write",
            tabBarIcon: ({
              color,
              focused,
            }: {
              color: string;
              focused: boolean;
            }) => (
              <TabBarIcon
                name={focused ? "pencil" : "pencil-outline"}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e: { preventDefault: () => void }) => {
              e.preventDefault();
              setIsWriteModalVisible(true);
            },
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarIcon: ({
              color,
              focused,
            }: {
              color: string;
              focused: boolean;
            }) => (
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
            tabBarIcon: ({
              color,
              focused,
            }: {
              color: string;
              focused: boolean;
            }) => (
              <TabBarIcon
                name={focused ? "person" : "person-outline"}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: (e: { preventDefault: () => void }) => {
              console.log("IN HERE, THE USER IS", user);
              if (!user) {
                e.preventDefault();
                handleProfilePress();
              } else {
                console.log("user is already logged in");
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
