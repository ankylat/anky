import { Anky } from "@/src/types/Anky";
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Animated,
} from "react-native";

interface UsersCollectedDisplayProps {
  userCollectedAnkys: Anky[];
}

const UsersCollectedDisplay: React.FC<UsersCollectedDisplayProps> = ({
  userCollectedAnkys,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollX = new Animated.Value(0);
  const { width: screenWidth } = Dimensions.get("window");
  const ITEM_SIZE = screenWidth * 0.72;
  const SPACING = 10;

  if (!userCollectedAnkys?.length) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-lg text-gray-500 text-center">
          No ankys in your collection yet.
        </Text>
        <Text className="text-sm text-gray-400 text-center mt-2">
          Go to the feed, read, and collect.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center">
      <Animated.FlatList
        data={userCollectedAnkys}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          paddingHorizontal: (screenWidth - ITEM_SIZE) / 2,
        }}
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ITEM_SIZE,
            index * ITEM_SIZE,
            (index + 1) * ITEM_SIZE,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
          });

          return (
            <Animated.View
              style={[
                {
                  width: ITEM_SIZE,
                  paddingHorizontal: SPACING,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <View className="bg-gray-100 rounded-full aspect-square overflow-hidden shadow-lg">
                <Image
                  source={{ uri: item.image_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <Text className="text-center mt-4 text-lg font-medium">
                {item.name}
              </Text>
            </Animated.View>
          );
        }}
      />
    </View>
  );
};

export default UsersCollectedDisplay;
