import React, { useState } from "react";
import { View, Image, TouchableOpacity, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { getAnkyverseDayForGivenTimestamp } from "@/src/app/lib/ankyverse";
import { Cast as CastType } from "@/src/types/Cast";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = width - 16; // Full width minus padding

interface CastProps {
  cast: CastType;
}

const Cast: React.FC<CastProps> = ({ cast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ankyverseColor, setAnkyverseColor] = useState("");

  React.useEffect(() => {
    const timestamp = new Date(cast.timestamp).getTime();
    const castKingdom = getAnkyverseDayForGivenTimestamp(timestamp);
    console.log("the ankyverse day is: ", castKingdom.currentColor.main);
    setAnkyverseColor(castKingdom.currentColor.main);
  }, [cast.timestamp]);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    height: isExpanded ? withTiming("auto") : withTiming(60),
  }));

  const handleCastAction = (
    action: "like" | "recast" | "comment" | "buy" | "share"
  ) => {
    alert(`${action}`);
  };

  const CastButtonsLeft = () => (
    <View className="flex-row gap-6">
      <TouchableOpacity onPress={() => handleCastAction("like")}>
        <Ionicons name="heart-outline" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleCastAction("recast")}>
        <Ionicons name="refresh-outline" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleCastAction("comment")}>
        <Ionicons name="chatbubble-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const CastButtonsRight = () => (
    <View className="flex-row gap-4">
      <TouchableOpacity onPress={() => handleCastAction("buy")}>
        <Ionicons name="cash-outline" size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleCastAction("share")}>
        <Ionicons name="share-social-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="px-2 mb-8">
      {cast.embeds?.[0]?.metadata?.image && (
        <Image
          source={{ uri: cast.embeds[0].url }}
          style={{
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: 8,
          }}
          resizeMode="cover"
        />
      )}

      <View className="flex-row justify-between items-center py-3">
        <CastButtonsLeft />
        <CastButtonsRight />
      </View>

      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
        <Animated.Text
          className="text-white text-sm"
          numberOfLines={isExpanded ? undefined : 3}
          style={[textAnimatedStyle]}
        >
          {cast.text}
        </Animated.Text>
      </TouchableOpacity>
    </View>
  );
};

export default Cast;
