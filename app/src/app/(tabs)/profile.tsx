import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Pressable,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../context/UserContext";

import ProfileGrid from "../../components/Profile/ProfileGrid";
import DraftsGrid from "../../components/Profile/DraftsGrid";
import { useQuilibrium } from "@/src/context/QuilibriumContext";

import {
  useEmbeddedWallet,
  usePrivy,
  useUnlinkFarcaster,
} from "@privy-io/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CollectedGrid from "@/src/components/Profile/CollectedGrid";
import { WritingSession } from "@/src/types/Anky";
import { useAnky } from "@/src/context/AnkyContext";
import UserAnkysGrid from "@/src/components/Profile/UserAnkysGrid";
import UserDraftsGrid from "@/src/components/Profile/UserDraftsGrid";
import UsersCollectedDisplay from "@/src/components/Profile/UsersCollectedDisplay";

const ProfileScreen = ({
  setShowWritingGame,
}: {
  setShowWritingGame: (show: boolean) => void;
}) => {
  const [viewMode, setViewMode] = useState<"ankys" | "drafts" | "collected">(
    "ankys"
  );
  const { ankyUser, isReady } = useQuilibrium();
  const { userStreak, userAnkys, userDrafts, userCollectedAnkys } = useAnky();
  console.log("THE USER IS: ", JSON.stringify(ankyUser, null, 2));
  const { logout } = usePrivy();
  const unlinkFarcaster = useUnlinkFarcaster();
  const wallet = useEmbeddedWallet();
  const [drafts, setDrafts] = useState<WritingSession[]>([]);
  const [doesUserHaveProfile, setDoesUserHaveProfile] = useState(false);

  const { casts, userMintedAnkys } = useUser();
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;

  useEffect(() => {
    const getDrafts = async () => {
      const storedDrafts = await AsyncStorage.getItem("writingSessions");
      console.log("the stored drafts are", storedDrafts);
      if (storedDrafts) {
        setDrafts(JSON.parse(storedDrafts));
      }
    };

    getDrafts();
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-10">
      <View className="items-center p-5 ">
        <View className="flex flex-row justify-between w-full">
          <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
            @{ankyUser?.username || "ಹನುಮಂತ"}
          </Text>

          <View className="flex flex-row gap-4">
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Settings", "Choose an option", [
                  {
                    text: "Unlink Farcaster",
                    onPress: () => {
                      console.log("Unlinking Farcaster account");
                    },
                    style: "default",
                  },
                  {
                    text: "Delete All Drafts",
                    onPress: async () => {
                      try {
                        await AsyncStorage.removeItem("writingSessions");
                        Alert.alert("Success", "All drafts have been deleted");
                      } catch (error) {
                        console.error("Error deleting drafts:", error);
                        Alert.alert("Error", "Failed to delete drafts");
                      }
                    },
                    style: "destructive",
                  },
                  {
                    text: "LOGOUT",
                    onPress: logout,
                    style: "destructive",
                  },
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                ]);
              }}
              className="bg-blue-500 rounded-full p-2"
            >
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => alert("Share")}
              className="bg-blue-500 rounded-full p-2"
            >
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex flex-row justify-between w-full items-center">
          <View className="relative ">
            <Image
              source={require("@/assets/images/anky.png")}
              className="w-24 h-24 rounded-full mb-2.5"
            />
          </View>

          <View className="flex flex-row gap-4 flex-1 px-16 justify-between">
            <View className="items-center">
              <Text className="text-3xl font-bold">
                {userAnkys?.length || 0}
              </Text>
              <Text className="text-xl text-gray-600">ankys</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold">{userStreak || 0}</Text>
              <Text className="text-xl text-gray-600">sadhana</Text>
            </View>
          </View>
        </View>

        <Text className="text-left text-2xl mt-2 w-full font-bold mb-1">
          {ankyUser?.display_name || "ಹನುಮಂತ"}
        </Text>
        <Text className="text-xl mb-1 w-full text-left">
          {ankyUser?.profile?.bio?.text || "ಪವನಸುತ | ಭಕ್ತಿ ಯೋಧ | ರಾಮ ಸೇವಕ"}
        </Text>

        <View className="flex-row mt-2">
          <TouchableOpacity
            className={`border-b-2 ${
              viewMode === "ankys" ? "border-gray-300" : "border-transparent"
            } px-4 py-2 mr-4`}
            onPress={() => setViewMode("ankys")}
          >
            <Text
              className={`${
                viewMode === "ankys"
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              Ankys
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`border-b-2 ${
              viewMode === "drafts" ? "border-gray-300" : "border-transparent"
            } px-4 py-2 mr-4`}
            onPress={() => setViewMode("drafts")}
          >
            <Text
              className={`${
                viewMode === "drafts"
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              Drafts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`border-b-2 ${
              viewMode === "collected"
                ? "border-gray-300"
                : "border-transparent"
            } px-4 py-2`}
            onPress={() => setViewMode("collected")}
          >
            <Text
              className={`${
                viewMode === "collected"
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              Collected
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView className="flex-1">
        {viewMode === "ankys" && <UserAnkysGrid userAnkys={userAnkys} />}
        {viewMode === "drafts" && <UserDraftsGrid userDrafts={userDrafts} />}
        {viewMode === "collected" && (
          <UsersCollectedDisplay userCollectedAnkys={userCollectedAnkys} />
        )}
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
