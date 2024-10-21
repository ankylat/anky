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
import { usePrivy } from "@privy-io/expo";

const ProfileScreen = () => {
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [viewMode, setViewMode] = useState<"ankys" | "drafts" | "collected">(
    "ankys"
  );
  const { casts, isLoading, error } = useUser();
  const { user } = usePrivy();
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;
  console.log("the  user is", casts[0]?.author);

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

  if (!casts || casts.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No casts available</Text>
      </View>
    );
  }

  const userInfo: User = casts[0].author;

  return (
    <ScrollView className="flex-1 bg-white pt-10">
      <View className="items-center p-5 ">
        <View className="flex flex-row justify-between w-full">
          <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
            @jpfraneto.eth
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
                uri: "https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/017bb663-b817-4064-bf93-46d6bf6e7f00/anim=false,fit=contain,f=auto,w=336",
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
              <Text className="text-2xl font-bold">{casts.length}</Text>
              <Text className="text-sm text-gray-600">ankys</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">23</Text>
              <Text className="text-sm text-gray-600">followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">8</Text>
              <Text className="text-sm text-gray-600">following</Text>
            </View>
          </View>
        </View>

        <Text className="text-left w-full font-bold mb-1">
          Jorge Pablo Franetovic 🎩
        </Text>
        <Text className="text-lg mb-1 w-full text-left">
          father. im here to mainly ask curious questions and anky pill you
          (anky.bot)
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
      {viewMode === "drafts" && isOwnProfile && (
        <Text>Drafts view (only visible to profile owner)</Text>
      )}
      {viewMode === "collected" && <Text>Collected view</Text>}
    </ScrollView>
  );
};

export default ProfileScreen;
