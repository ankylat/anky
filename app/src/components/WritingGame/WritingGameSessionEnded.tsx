import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WritingGameSessionEndedProps {
  sessionDuration: number;
  totalTaps: number;
  wordsWritten: number;
  initialInquiry: {
    prompt: string;
    color: string;
  };
  onClose: () => void;
  targetReached: boolean;
  targetDuration: number;
  sessionId: string;
}

const WritingGameSessionEnded: React.FC<WritingGameSessionEndedProps> = ({
  sessionDuration,
  wordsWritten,
  totalTaps = 396,
  initialInquiry,
  onClose,
  targetReached,
  targetDuration,
  sessionId,
}) => {
  const navigation = useNavigation();
  const consecutiveDays = 1; // Hardcoded for now
  const [rotation] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(1));

  useEffect(() => {
    console.log("WritingGameSessionEnded component mounted");
    if (targetReached) {
      startAnkyAnimation();
    }
    return () => {
      console.log("WritingGameSessionEnded component unmounted");
    };
  }, []);

  const startAnkyAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const handleSendPress = async () => {
    console.log("Send button pressed");
    if (targetReached) {
      // Logic for notifying user when Anky is ready
      console.log("User will be notified when Anky is ready");
    } else {
      // Store as a draft
      try {
        const draft = {
          sessionDuration,
          wordsWritten,
          totalTaps,
          initialInquiry,
          sessionId,
          date: new Date().toISOString(),
        };
        const drafts = await AsyncStorage.getItem("writingDrafts");
        const updatedDrafts = drafts ? [...JSON.parse(drafts), draft] : [draft];
        await AsyncStorage.setItem(
          "writingDrafts",
          JSON.stringify(updatedDrafts)
        );
        console.log("Draft saved successfully");
      } catch (error) {
        console.error("Error saving draft:", error);
      }
    }
    onClose();
  };

  return (
    <View className="flex-1 bg-black px-5 py-20 justify-between">
      <View className="flex-row justify-around mt-2 ">
        <View className="items-center mx-5">
          <Text className="text-white text-5xl font-bold">
            {Math.floor(sessionDuration)}
          </Text>
          <Text className="text-white text-lg font-bold mt-1">seconds</Text>
        </View>
        <View className="items-center mx-5">
          <Text className="text-white text-5xl font-bold">{wordsWritten}</Text>
          <Text className="text-white text-lg font-bold mt-1">words</Text>
        </View>
        <View className="items-center mx-5">
          <Text className="text-yellow-400 text-5xl font-bold">
            {totalTaps}
          </Text>
          <Text className="text-white text-lg font-bold mt-1">taps</Text>
        </View>
      </View>

      <View className="items-center my-1">
        <Text className="text-white text-7xl font-bold">{consecutiveDays}</Text>
        <Text className="text-white text-3xl font-bold mt-1">
          CONSECUTIVE DAYS
        </Text>
        <View className="flex-row items-center justify-center mt-2">
          {[...Array(7)].map((_, index) => (
            <View
              key={index}
              className={`w-5 h-5 rounded-full mx-1 ${
                index < consecutiveDays ? "bg-green-500" : "bg-gray-700"
              }`}
            />
          ))}
        </View>
      </View>

      {targetReached ? (
        <View className="items-center my-2">
          <View style={{ position: "relative" }}>
            <Animated.Image
              source={require("@/assets/images/anky_seed.png")}
              style={{
                width: 222,
                height: 222,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <Text className="text-white text-lg font-bold text-center">
                Your Anky is awakening...
              </Text>
              <Text className="text-white text-md text-center mt-2">
                Something magical is happening!
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="items-center my-2">
          <Text className="text-white text-lg font-bold">
            Write for {targetDuration - sessionDuration} more seconds to get an
            Anky!
          </Text>
          <View className="w-full bg-gray-700 rounded-full h-4 mt-2">
            <View
              className="bg-yellow-400 h-4 rounded-full"
              style={{ width: `${(sessionDuration / targetDuration) * 100}%` }}
            />
          </View>
        </View>
      )}

      <TouchableOpacity
        className="bg-yellow-400 py-3 px-6 rounded-full mb-16"
        onPress={handleSendPress}
      >
        <Text className="text-black text-lg font-bold text-center">
          {targetReached ? "Notify me when ready" : "Save as Insight"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default WritingGameSessionEnded;
