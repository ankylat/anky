import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Cast } from "@/src/types/Cast";

interface CastElementProps {
  cast: Cast;
  isInModal?: boolean;
}

const CastElement: React.FC<CastElementProps> = ({
  cast,
  isInModal = false,
}) => {
  const [isTextExpanded, setIsTextExpanded] = useState(isInModal);

  const toggleTextExpansion = () => {
    if (!isInModal) {
      setIsTextExpanded(!isTextExpanded);
    }
  };

  return (
    <View className="mb-4">
      {cast.embeds[0]?.url ? (
        <Image
          source={{ uri: cast.embeds[0].url }}
          className="aspect-square w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="aspect-square w-full bg-gray-200" />
      )}
      <View className="p-2">
        <Text className="text-lg font-bold mb-2">{cast.author.username}</Text>
        <TouchableOpacity onPress={toggleTextExpansion}>
          <Text
            className="text-sm text-gray-800"
            numberOfLines={isTextExpanded ? undefined : 3}
          >
            {cast.text}
          </Text>
        </TouchableOpacity>
        <View className="w-full flex-row bg-red-200 justify-between mt-2">
          <TouchableOpacity>
            <Ionicons name="heart-outline" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="chatbubble-outline" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="paper-plane-outline" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="bookmark-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CastElement;
