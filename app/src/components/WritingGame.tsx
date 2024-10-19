import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useAnky } from "@/src/context/AnkyContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

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
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [wordsWritten, setWordsWritten] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const lastKeystroke = useRef<number>(Date.now());
  const animatedValue = useRef(new Animated.Value(1)).current;
  const {
    sendWritingToAnky,
    setIsWriteModalVisible,
    isUserWriting,
    setIsUserWriting,
  } = useAnky();
  const textInputRef = useRef<TextInput>(null);

  const sessionSeconds: number = 8;

  const [currentMode, setCurrentMode] = useState<string>("up");
  const modes = {
    up: { prompt: "Tell us who you are", color: "#000000" },
    right: { prompt: "What's your biggest dream?", color: "#1a237e" },
    down: { prompt: "Describe your perfect day", color: "#004d40" },
    left: { prompt: "What's your greatest fear?", color: "#b71c1c" },
  };

  const swipeThreshold = 50;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: () => {},
    onPanResponderRelease: (_, gestureState) => {
      const { dx, dy } = gestureState;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
        // Horizontal swipe
        if (dx > 0) {
          setCurrentMode("right");
        } else {
          setCurrentMode("left");
        }
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > swipeThreshold) {
        // Vertical swipe
        if (dy > 0 && currentMode !== "down") {
          setCurrentMode("down");
        } else if (dy < 0) {
          setCurrentMode("up");
        }
      }
    },
  });

  useEffect(() => {
    if (!sessionStarted) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastKeystroke = (now - lastKeystroke.current) / 1000;

      if (timeSinceLastKeystroke >= sessionSeconds) {
        clearInterval(interval);
        setGameOver(true);
        const text = textInputRef.current?.props.value || "";
        sendWritingToAnky(text);
        saveWritingToStorage(text);
        setWordsWritten(text.trim().split(/\s+/).length);
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
  }, [sessionStarted]);

  const handleTextChange = (): void => {
    lastKeystroke.current = Date.now();
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

  const handleCancel = () => {
    setIsWriteModalVisible(false);
  };

  const startSession = () => {
    setSessionStarted(true);
    setIsUserWriting(true);
    textInputRef.current?.focus();
    Keyboard.dismiss();
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  if (gameOver) {
    return (
      <View className="flex-1 w-full justify-center items-center p-5 bg-black">
        <Text className="text-3xl font-bold mb-5 text-white">
          Writing Session Over!
        </Text>
        <Text className="text-xl mb-2.5 text-white">
          Words written: {wordsWritten}
        </Text>
        <Text className="text-xl mb-2.5 text-white">
          Time spent: {Math.floor(timeSpent)} seconds
        </Text>
        <TouchableOpacity
          className="bg-purple-500 p-3 rounded-md"
          onPress={() => setIsWriteModalVisible(false)}
        >
          <Text className="text-xl text-white">Continue to App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      className="flex-1 w-full fixed"
      style={{
        backgroundColor: modes[currentMode as keyof typeof modes].color,
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        className="h-8 bg-green-500"
        style={{
          width: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
      <TextInput
        ref={textInputRef}
        className="flex-1 text-2xl p-5 text-white"
        multiline
        onChangeText={handleTextChange}
        placeholder={modes[currentMode as keyof typeof modes].prompt}
        placeholderTextColor="#999"
        editable={sessionStarted}
      />
      {!sessionStarted && (
        <TouchableWithoutFeedback onPress={startSession}>
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.1)",
              justifyContent: "center",
              alignItems: "center",
            }}
          />
        </TouchableWithoutFeedback>
      )}
      {!sessionStarted && (
        <View
          style={{
            position: "absolute",
            bottom: 34, // Adjust this value to match the tab bar height
            left: 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            className="bg-purple-500 rounded-full p-4"
            onPress={handleCancel}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Text className="text-xl text-white">👽</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default WritingGame;
