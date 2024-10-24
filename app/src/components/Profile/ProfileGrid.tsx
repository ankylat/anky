import React from "react";
import { Dimensions, FlatList } from "react-native";
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
