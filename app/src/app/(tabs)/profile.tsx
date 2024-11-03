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
import { User } from "../../types/User";
import { Cast } from "../../types/Cast";
import ProfileGrid from "../../components/Profile/ProfileGrid";
import DraftsGrid from "../../components/Profile/DraftsGrid";
import { useQuilibrium } from "@/src/context/QuilibriumContext";
import AetherCoin from "@/assets/icons/aether.svg";
import LuminaCoin from "@/assets/icons/lumina.svg";
import TerraCoin from "@/assets/icons/terra.svg";
import { Link } from "expo-router";
import { calculateBalance } from "@/src/app/lib/transactions";
import NotLoggedInUserView from "@/src/components/Profile/NotLoggedInUserView";
import {
  useEmbeddedWallet,
  usePrivy,
  useUnlinkFarcaster,
} from "@privy-io/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CollectedGrid from "@/src/components/Profile/CollectedGrid";
import { WritingSession } from "@/src/types/Anky";
import UserWithoutProfile from "@/src/components/Profile/UserWithoutProfile";

const ProfileScreen = ({
  setShowWritingGame,
}: {
  setShowWritingGame: (show: boolean) => void;
}) => {
  const [viewMode, setViewMode] = useState<"ankys" | "drafts" | "collected">(
    "ankys"
  );
  const { user, isReady } = useQuilibrium();
  console.log("THE USER IS: ", JSON.stringify(user, null, 2));
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

  if (!user) {
    return <NotLoggedInUserView />;
  }

  if (!doesUserHaveProfile) {
    return <UserWithoutProfile setShowWritingGame={setShowWritingGame} />;
  }

  const farcasterAccount = user.linked_accounts.find(
    (account) => account.type === "farcaster"
  );

  return (
    <View className="flex-1 bg-white pt-10">
      <View className="items-center p-5 ">
        <View className="flex flex-row justify-between w-full">
          <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
            @{farcasterAccount?.username || "your_username"}
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
              source={{
                uri:
                  farcasterAccount?.profile_picture_url ||
                  "https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/017bb663-b817-4064-bf93-46d6bf6e7f00/anim=false,fit=contain,f=auto,w=336",
              }}
              className="w-24 h-24 rounded-full mb-2.5"
            />
            <Pressable
              onPress={() => alert("Edit")}
              className="absolute bottom-0 right-0"
            >
              <Text className="text-3xl">👽</Text>
            </Pressable>
          </View>

          <View className="flex flex-row gap-4 flex-1 px-16 justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold">{casts?.length || 0}</Text>
              <Text className="text-sm text-gray-600">ankys</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">0</Text>
              <Text className="text-sm text-gray-600">streak</Text>
            </View>
          </View>
        </View>
        <Pressable
          className=""
          onPress={async () => {
            // return const response = await logout();
            try {
              console.log("the wallet is", wallet?.account?.address);
              console.log("copying to clipboard");
              await Clipboard.setStringAsync(wallet?.account?.address || "");
            } catch (error) {
              console.log("there was an error creating the wallet", error);
            }
          }}
        >
          <Text className="text-lg my-2">
            {user.linked_accounts.find(
              (account) =>
                account.type === "wallet" && account.wallet_client == "privy"
            )?.address || "logout"}
          </Text>
        </Pressable>
        <Link
          href={`/transactions/${farcasterAccount?.fid || "18350"}`}
          asChild
        >
          <TouchableOpacity className="w-2/3 border-2 border-yellow-400 rounded-lg p-4 my-4">
            <View className="flex-row justify-between w-full">
              <View className="flex-row items-center">
                <AetherCoin width={40} height={40} />
                <Text className="ml-2 text-lg">--</Text>
              </View>
              <View className="flex-row items-center">
                <LuminaCoin width={40} height={40} />
                <Text className="ml-2 text-lg">--</Text>
              </View>
              <View className="flex-row items-center">
                <TerraCoin width={40} height={40} />
                <Text className="ml-2 text-lg">--</Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-gray-600 ml-auto">
                Balance: -- $newen
              </Text>
            </View>
          </TouchableOpacity>
        </Link>

        <Text className="text-left w-full font-bold mb-1">
          {farcasterAccount?.display_name || "Display Name"}
        </Text>
        <Text className="text-lg mb-1 w-full text-left">
          {farcasterAccount?.bio || "No bio available"}
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
        {viewMode === "ankys" && <ProfileGrid casts={casts} />}
        {viewMode === "drafts" && <DraftsGrid drafts={drafts} />}
        {viewMode === "collected" && (
          <CollectedGrid userCollection={userMintedAnkys} />
        )}
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
