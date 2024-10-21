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
import { processWritingSession } from "../app/lib/writingGame";
import { usePrivy } from "@privy-io/expo";

const { width, height } = Dimensions.get("window");

interface ModeConfig {
  prompt: string;
  color: string;
  component?: React.ComponentType<any>;
}

interface PlaygroundProps {
  modes?: {
    up: ModeConfig;
    right: ModeConfig;
    down: ModeConfig;
    left: ModeConfig;
  };
  sessionSeconds?: number;
  onGameOver?: (wordsWritten: number, timeSpent: number) => void;
}

interface Writing {
  text: string;
  timestamp: string;
}

const defaultModes = {
  up: { prompt: "Tell us who you are", color: "#000000", component: null },
  right: {
    prompt: "What's your biggest dream?",
    color: "#1a237e",
    component: null,
  },
  down: {
    prompt: "Describe your perfect day",
    color: "#004d40",
    component: null,
  },
  left: {
    prompt: "What's your greatest fear?",
    color: "#b71c1c",
    component: null,
  },
};

const WritingGame: React.FC<PlaygroundProps> = ({
  modes = defaultModes,
  sessionSeconds = 8,
  onGameOver,
}) => {
  const { user } = usePrivy();
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

  const [currentMode, setCurrentMode] = useState<string>("up");

  const swipeThreshold = 50;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: () => {},
    onPanResponderRelease: (_, gestureState) => {
      const { dx, dy } = gestureState;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
        if (dx > 0) {
          setCurrentMode("right");
        } else {
          setCurrentMode("left");
        }
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > swipeThreshold) {
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

        // Here the writing needs to be processed
        if (user) {
          processWritingSession(text, timeSpent, user);
        } else {
          alert("User is not authenticated");
        }

        const words = text.trim().split(/\s+/).length;
        setWordsWritten(words);

        if (onGameOver) {
          onGameOver(words, Math.floor(timeSpent));
        }
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
  }, [sessionStarted, sessionSeconds, onGameOver]);

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

  const CurrentModeComponent =
    modes[currentMode as keyof typeof modes]?.component;

  return (
    <View
      className="flex-1 w-full fixed"
      style={{
        backgroundColor: modes[currentMode as keyof typeof modes].color,
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        className="h-14 bg-green-500"
        style={{
          width: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
      {CurrentModeComponent ? (
        <CurrentModeComponent />
      ) : (
        <TextInput
          ref={textInputRef}
          className="flex-1 text-2xl p-5 text-white"
          multiline
          onChangeText={handleTextChange}
          placeholder={modes[currentMode as keyof typeof modes].prompt}
          placeholderTextColor="#999"
          editable={sessionStarted}
        />
      )}
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
            bottom: 36,
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
