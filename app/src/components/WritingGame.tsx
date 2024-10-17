import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
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
      <View className="flex-1 justify-start items-center p-5 bg-purple-600">
        <Text className="text-2xl font-bold mb-5">Writing Session Over!</Text>
        <Text className="text-lg mb-2.5">Words written: {wordsWritten}</Text>
        <Text className="text-lg mb-2.5">
          Time spent: {timeSpent.toFixed(1)} seconds
        </Text>
        <Text
          className="text-lg text-blue-500 p-3 rounded-md bg-purple-500"
          onPress={() => setIsWriteModalVisible(false)}
        >
          Continue to App
        </Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback>
      <View className="flex-1 bg-red-200">
        <Animated.View
          className="h-2.5 bg-green-500"
          style={{
            width: "100%",
            opacity: animatedValue,
          }}
        />
        <TextInput
          className="flex-1 text-lg p-5"
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
