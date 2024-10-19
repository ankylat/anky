import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
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
      <View className="flex-row justify-between">
        <View className="flex-row items-center  gap-2 p-2">
          <Image
            source={{ uri: cast.author.pfp_url }}
            className="aspect-square w-12 rounded-full"
            resizeMode="cover"
          />
          <Text className="text-lg font-bold">
            <Text className="text-lg font-bold">
              @{cast.author.username}
              <Text className="text-purple-600"> /anky</Text>
            </Text>
          </Text>
        </View>
        <View className="p-2 flex-row items-center gap-2 pr-4">
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Options",
                "Choose an action",
                [
                  {
                    text: "Share",
                    onPress: () => console.log("Share pressed"),
                  },
                  {
                    text: "Report",
                    onPress: () => console.log("Report pressed"),
                  },
                  { text: "Cancel", style: "cancel" },
                ],
                { cancelable: true }
              )
            }
          >
            <Ionicons
              name="ellipsis-horizontal-outline"
              size={28}
              color="black"
            />
          </TouchableOpacity>
        </View>
      </View>

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
          <View>
            <Text
              className="text-sm text-gray-800"
              numberOfLines={isTextExpanded ? undefined : 3}
            >
              {cast.text}
            </Text>
            {!isTextExpanded && cast.text.length > 150 && (
              <Text className="text-sm text-purple-600 mt-1">Read more...</Text>
            )}
          </View>
        </TouchableOpacity>
        <View className="w-full flex-row  justify-between mt-2">
          <View className="flex-row gap-3">
            <TouchableOpacity>
              <Ionicons name="heart-outline" size={28} color="black" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="chatbubble-outline" size={28} color="black" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="sync-outline" size={28} color="black" />
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity>
              <Ionicons name="diamond-outline" size={28} color="black" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="paper-plane-outline" size={28} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CastElement;
