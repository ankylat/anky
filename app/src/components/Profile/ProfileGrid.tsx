import React, { useState } from "react";
import {
  View,
  Dimensions,
  FlatList,
  Modal,
  TouchableOpacity,
  Text,
} from "react-native";
import ProfileGridElement from "./ProfileGridElement";
import { Cast } from "@/src/types/Cast";
import CastElement from "@/src/components/Cast";

interface ProfileGridProps {
  casts: Cast[];
}

const ProfileGrid: React.FC<ProfileGridProps> = ({ casts }) => {
  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;

  const renderItem = ({ item }: { item: Cast }) => (
    <ProfileGridElement
      cast={item}
      size={itemSize}
      onPress={() => setSelectedCast(item)}
    />
  );

  return (
    <View>
      <FlatList
        data={casts}
        renderItem={renderItem}
        keyExtractor={(item) => item.hash}
        numColumns={3}
      />
    </View>
  );
};

export default ProfileGrid;
