import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { useAnky } from "@/src/context/AnkyContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

interface WritingGameProps {
  prompt?: string;
}

interface Writing {
  text: string;
  timestamp: string;
}

const WritingGame: React.FC<WritingGameProps> = ({
  prompt = "Tell us who you are",
}) => {
  const [text, setText] = useState<string>("");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [wordsWritten, setWordsWritten] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const lastKeystroke = useRef<number>(Date.now());
  const animatedValue = useRef(new Animated.Value(1)).current;
  const { sendWritingToAnky, setIsWriteModalVisible } = useAnky();

  const sessionSeconds: number = 8;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastKeystroke = (now - lastKeystroke.current) / 1000;

      if (timeSinceLastKeystroke >= sessionSeconds) {
        clearInterval(interval);
        setGameOver(true);
        sendWritingToAnky(text);
        saveWritingToStorage(text);
      } else {
        setTimeSpent((prev) => prev + 0.1);
      }

      Animated.timing(animatedValue, {
        toValue: 1 - timeSinceLastKeystroke / sessionSeconds,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }, 100);

    return () => clearInterval(interval);
  }, [text]);

  const handleTextChange = (newText: string): void => {
    setText(newText);
    lastKeystroke.current = Date.now();
    setWordsWritten(newText.trim().split(/\s+/).length);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const saveWritingToStorage = async (writing: string): Promise<void> => {
    try {
      const existingWritings = await AsyncStorage.getItem("userWritings");
      let writings: Writing[] = existingWritings
        ? JSON.parse(existingWritings)
        : [];
      writings.push({
        text: writing,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem("userWritings", JSON.stringify(writings));
    } catch (error) {
      console.error("Error saving writing to storage:", error);
    }
  };

  if (gameOver) {
    return (
      <View className="w-full flex-1 justify-center items-center p-5 ">
        <Text className="text-lg mb-2.5">Words written: {wordsWritten}</Text>
        <Text className="text-lg mb-2.5">
          Time spent: {Math.floor(timeSpent)} seconds
        </Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-full shadow-md active:bg-blue-600"
          onPress={() => setIsWriteModalVisible(false)}
        >
          <Text className="text-white text-lg font-semibold">
            Continue to App
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback>
      <View className="flex-1 items-center justify-center w-full">
        <Animated.View
          className="h-2.5 bg-green-500"
          style={{
            width: "100%",
            opacity: animatedValue,
          }}
        />
        <TextInput
          className="flex-1 justify-center text-lg p-5"
          multiline
          value={text}
          onChangeText={handleTextChange}
          placeholder="Start typing mfer..."
          placeholderTextColor="#999"
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default WritingGame;
