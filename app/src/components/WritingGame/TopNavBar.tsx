import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import React, { useEffect } from "react";
import { useQuilibrium } from "@/src/context/QuilibriumContext";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

interface TopNavBarProps {
  sessionStarted: boolean;
  setGameOver: (gameOver: boolean) => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({
  sessionStarted,
  setGameOver,
}) => {
  const { user } = useQuilibrium();
  const height = useSharedValue(112); // 28rem = 112px

  const handleDrawerPress = () => {
    Alert.alert("drawer opened");
  };

  useEffect(() => {
    height.value = withTiming(sessionStarted ? 0 : 70, {
      duration: 500,
    });
  }, [sessionStarted]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      height: height.value,
    };
  });

  return (
    <Animated.View
      style={[animatedStyles]}
      className="w-full bg-black px-4 flex-row justify-between items-end "
    >
      <TouchableOpacity onPress={handleDrawerPress}>
        <Feather name="menu" size={24} color="white" />
      </TouchableOpacity>

      <View className="w-10 h-10 rounded-full bg-red-500" />
    </Animated.View>
  );
};

export default TopNavBar;
