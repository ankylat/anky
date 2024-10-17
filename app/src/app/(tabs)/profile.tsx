import React from "react";
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

const ProfileScreen = () => {
  const { casts, isLoading, error } = useUser();
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

  if (!casts || casts.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No casts available</Text>
      </View>
    );
  }

  const userInfo: User = casts[0].author;

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center p-5">
        <Image
          source={{
            uri: userInfo.pfp_url || "https://via.placeholder.com/100",
          }}
          className="w-24 h-24 rounded-full mb-2.5"
        />
        <Text className="text-lg font-bold mb-2.5">{userInfo.username}</Text>
        <View className="flex-row justify-around w-full mb-4">
          <View className="items-center">
            <Text className="text-lg font-bold">{casts.length}</Text>
            <Text className="text-sm text-gray-600">ankys</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold">{userInfo.follower_count}</Text>
            <Text className="text-sm text-gray-600">followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold">
              {userInfo.following_count}
            </Text>
            <Text className="text-sm text-gray-600">following</Text>
          </View>
        </View>
        <Text className="text-base font-bold mb-1">
          {userInfo.display_name}
        </Text>
        <Text className="text-sm mb-0.5">
          {userInfo.profile?.bio?.text || "No bio available"}
        </Text>
        <View className="flex-row mb-5">
          <TouchableOpacity className="bg-blue-500 rounded-full px-4 py-2 mr-2">
            <Text className="text-white font-bold">Following</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 rounded-full px-4 py-2 mr-2">
            <Text className="text-white font-bold">Message</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-500 rounded-full px-4 py-2">
            <Text className="text-white font-bold">Email</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ProfileGrid casts={casts} />
    </ScrollView>
  );
};

export default ProfileScreen;
