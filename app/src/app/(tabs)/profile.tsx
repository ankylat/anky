import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from "react-native";
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

const ProfileScreen = () => {
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [viewMode, setViewMode] = useState<"ankys" | "drafts" | "collected">(
    "ankys"
  );
  const { casts, drafts, isLoading, error } = useUser();
  const { user } = useQuilibrium();
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Error: {error}</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No user data available</Text>
      </View>
    );
  }

  const farcasterAccount = user.linked_accounts.find(
    (account) => account.type === "farcaster"
  );

  return (
    <ScrollView className="flex-1 bg-white pt-10">
      <View className="items-center p-5 ">
        <View className="flex flex-row justify-between w-full">
          <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
            @{farcasterAccount?.username || "Username"}
          </Text>
          <View className="flex flex-row gap-4">
            {isOwnProfile && (
              <TouchableOpacity
                onPress={() => alert("Settings")}
                className="bg-blue-500 rounded-full p-2"
              >
                <Ionicons name="settings-outline" size={24} color="white" />
              </TouchableOpacity>
            )}

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
              <Text className="text-2xl font-bold">--</Text>
              <Text className="text-sm text-gray-600">followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">--</Text>
              <Text className="text-sm text-gray-600">following</Text>
            </View>
          </View>
        </View>
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
              <Text className="text-sm text-gray-600">Balance: -- $newen</Text>
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
          {isOwnProfile && (
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
          )}
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
      {viewMode === "ankys" && <ProfileGrid casts={casts} />}
      {viewMode === "drafts" && <DraftsGrid drafts={drafts} />}
      {viewMode === "collected" && <Text>Collected view</Text>}
    </ScrollView>
  );
};

export default ProfileScreen;
