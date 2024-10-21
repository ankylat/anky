import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

const UserProfileScreen = () => {
  const { fid } = useLocalSearchParams<{ fid: string }>();

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold">User Profile</Text>
      <Text className="text-lg mt-4">FID: {fid}</Text>
    </View>
  );
};

export default UserProfileScreen;
