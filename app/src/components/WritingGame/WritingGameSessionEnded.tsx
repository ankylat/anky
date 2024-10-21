import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface WritingGameSessionEndedProps {
  sessionDuration: number;
  totalTaps: number;
  wordsWritten: number;
  initialInquiry: {
    prompt: string;
    color: string;
  };
  onClose: () => void;
}

const WritingGameSessionEnded: React.FC<WritingGameSessionEndedProps> = ({
  sessionDuration,
  wordsWritten,
  totalTaps = 396,
  initialInquiry,
  onClose,
}) => {
  const navigation = useNavigation();
  const consecutiveDays = 9; // Hardcoded for now
  const minsToday = 16; // Hardcoded for now
  const wordsTotal = 12883; // Hardcoded for now

  useEffect(() => {
    console.log("WritingGameSessionEnded component mounted");
    return () => {
      console.log("WritingGameSessionEnded component unmounted");
    };
  }, []);

  const handleSendPress = () => {
    console.log("Send button pressed");
    // Add your send logic here
  };

  return (
    <View className="flex-1 bg-black px-5 py-20 justify-between">
      <View className="items-center my-5">
        <View className="flex-row items-center justify-center">
          <MaterialCommunityIcons name="meditation" size={50} color="yellow" />
          <Text className="text-yellow-400 text-5xl font-bold ml-2">
            {totalTaps}
          </Text>
        </View>
        <Text className="text-white text-lg font-bold mt-1">TOTAL TAPS</Text>
      </View>

      <View className="items-center my-5">
        <Text className="text-white text-9xl font-bold">N</Text>
        <Text className="text-white text-lg font-bold mt-1">
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

      <View className="flex-row items-center justify-center my-5 mb-20">
        <View className="items-center mx-5">
          <Text className="text-white text-5xl font-bold">
            {Math.floor(sessionDuration)}
          </Text>
          <Text className="text-white text-lg font-bold mt-1">⏳</Text>
        </View>
        <View className="items-center mx-5">
          <Text className="text-white text-5xl font-bold">{wordsWritten}</Text>
          <Text className="text-white text-lg font-bold mt-1">📝</Text>
        </View>
      </View>
    </View>
  );
};

export default WritingGameSessionEnded;
