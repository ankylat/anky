import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/src/api/user";
import ProfileGrid from "@/src/components/Profile/ProfileGrid";
import AetherCoin from "@/assets/icons/aether.svg";
import LuminaCoin from "@/assets/icons/lumina.svg";
import TerraCoin from "@/assets/icons/terra.svg";
import { Link } from "expo-router";

const UserProfileScreen = () => {
  const { fid } = useLocalSearchParams<{ fid: string }>();
  const [viewMode, setViewMode] = useState<"ankys" | "collected">("ankys");
  const screenWidth = Dimensions.get("window").width;
  console.log("in here, the fid is: ", fid);
  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["getUserProfile", fid],
    queryFn: () => getUserProfile(fid as string),
  });
  console.log("the user profile is: ", JSON.stringify(userData, null, 2));

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-2xl font-bold">Error loading user profile</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-2xl font-bold">User profile not found</Text>
      </View>
    );
  }

  const { user, casts } = userData;

  return (
    <ScrollView className="flex-1 bg-white pt-10">
      <View className="items-center p-5">
        <View className="flex flex-row justify-between w-full">
          <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
            @{user.username || "Username"}
          </Text>
          <TouchableOpacity
            onPress={() => alert("Share")}
            className="bg-blue-500 rounded-full p-2"
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex flex-row justify-between w-full items-center">
          <Image
            source={{
              uri:
                user.pfp_url ||
                "https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/017bb663-b817-4064-bf93-46d6bf6e7f00/anim=false,fit=contain,f=auto,w=336",
            }}
            className="w-24 h-24 rounded-full mb-2.5"
          />

          <View className="flex flex-row gap-4 flex-1 px-16 justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold">{casts?.length || 0}</Text>
              <Text className="text-sm text-gray-600">ankys</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">
                {user.follower_count || "--"}
              </Text>
              <Text className="text-sm text-gray-600">followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">
                {user.following_count || "--"}
              </Text>
              <Text className="text-sm text-gray-600">following</Text>
            </View>
          </View>
        </View>

        <Link href={`/transactions/${fid}`} asChild>
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
          {user.display_name || "Display Name"}
        </Text>
        <Text className="text-lg mb-1 w-full text-left">
          {user.profile?.bio?.text || "No bio available"}
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
      {viewMode === "ankys" && casts && casts.length > 0 ? (
        <ProfileGrid casts={casts} />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-lg text-center mb-4">
            This user hasn't created any ankys yet.
          </Text>
          <TouchableOpacity
            onPress={() => alert("Create an anky")}
            className="bg-blue-500 rounded-full px-4 py-2"
          >
            <Text className="text-white font-bold">Send them a message</Text>
          </TouchableOpacity>
        </View>
      )}
      {viewMode === "collected" && <Text>Collected view</Text>}
    </ScrollView>
  );
};

export default UserProfileScreen;
