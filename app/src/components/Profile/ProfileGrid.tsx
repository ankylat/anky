import React from "react";
import { Dimensions, FlatList, Text, View } from "react-native";
import ProfileGridElement from "./ProfileGridElement";
import { Cast } from "@/src/types/Cast";
import { Link, useRouter } from "expo-router";

interface ProfileGridProps {
  casts: Cast[];
}

const ProfileGrid: React.FC<ProfileGridProps> = ({ casts }) => {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;

  const renderItem = ({ item }: { item: Cast }) => (
    <Link href={`/cast/${item.hash}` as const} asChild>
      <ProfileGridElement
        cast={item}
        size={itemSize}
        onPress={() => router.push(`/cast/${item.hash}`)}
      />
    </Link>
  );

  if (!casts || casts.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-gray-500 text-center">
          Write your first anky to see it here! (480 seconds or more)
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={casts}
      renderItem={renderItem}
      keyExtractor={(item) => item.hash}
      numColumns={3}
      scrollEnabled={false}
      nestedScrollEnabled={true}
    />
  );
};

export default ProfileGrid;
