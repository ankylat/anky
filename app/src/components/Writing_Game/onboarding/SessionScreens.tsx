// SessionScreens.tsx
import { prettyLog } from "@/src/app/lib/logs";
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  interpolateColor,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { characters } from "@/src/app/lib/ankyverse";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LinearGradient from "react-native-svg/lib/typescript/elements/LinearGradient";
import { WritingSession } from "@/src/types/Anky";
import { useAnky } from "@/src/context/AnkyContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllUserDataFromLocalStorage } from "@/src/app/lib/development";
import { router } from "expo-router";

const { height, width } = Dimensions.get("window");

// Writing progress bar component
const WritingProgressBar = ({
  timeSinceLastKeystroke,
  elapsedTime,
}: {
  timeSinceLastKeystroke: number;
  elapsedTime: number;
}) => {
  const keystrokeProgress = useSharedValue(1);
  const sessionProgress = useSharedValue(0);
  const secondsBetweenKeystrokes = 8;
  const maxSessionDuration = 480000; // 480 seconds in milliseconds

  useEffect(() => {
    keystrokeProgress.value = withTiming(
      1 - timeSinceLastKeystroke / secondsBetweenKeystrokes,
      {
        duration: 100,
      }
    );

    sessionProgress.value = withTiming(elapsedTime / maxSessionDuration, {
      duration: 100,
    });
  }, [timeSinceLastKeystroke, elapsedTime]);

  const keystrokeAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${keystrokeProgress.value * 100}%`,
      backgroundColor: interpolateColor(
        keystrokeProgress.value,
        [0, 0.143, 0.286, 0.429, 0.571, 0.714, 0.857, 1],
        [
          "#ff0000",
          "#ffa500",
          "#ffff00",
          "#00ff00",
          "#0000ff",
          "#4b0082",
          "#8b00ff",
          "#ffffff",
        ]
      ),
    };
  });

  const sessionAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${sessionProgress.value * 100}%`,
      backgroundColor: interpolateColor(
        sessionProgress.value,
        [0, 0.143, 0.286, 0.429, 0.571, 0.714, 0.857, 1],
        [
          "#ff0000",
          "#ffa500",
          "#ffff00",
          "#00ff00",
          "#0000ff",
          "#4b0082",
          "#8b00ff",
          "#ffffff",
        ]
      ),
    };
  });

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View style={[styles.lifeBar, keystrokeAnimatedStyle]} />
      <Animated.View style={[styles.progressBar, sessionAnimatedStyle]} />
    </View>
  );
};

interface SessionData {
  text: string;
  totalDuration: number;
  wordCount: number;
  averageWPM: number;
}

// Screen for both complete and incomplete sessions
export const SessionEndScreen: React.FC<{
  session_id: string;
  onNextStep: () => void;
  writingString: string;
}> = ({ session_id, onNextStep, writingString }) => {
  console.log("SESSION ID", session_id);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const {
    writingSession,
    setWritingSession,
    setIsWritingGameVisible,
    setDidUserWriteToday,
  } = useAnky();
  async function funFunction() {
    // TODOOOO
    // Get new prompt from API or local storage
    // This would need to be implemented elsewhere:
    // - Add prompt generation/fetching logic
    // - Add prompt storage/caching
    // - Add prompt selection logic
  }
  async function printLocalStorage() {
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log("All AsyncStorage Keys:", allKeys);

    // Print each key-value pair
    for (const key of allKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`Key: ${key}`);
      console.log(`Value: ${value}`);
      console.log("-------------------");
    }

    // Also specifically log writing sessions file
    const writingSessions = await AsyncStorage.getItem("writing_sessions.txt");
    console.log("Writing Sessions File:", writingSessions);
  }
  async function getSessionDataFromWritingString() {
    const lines = writingString.split("\n");
    console.log("Number of lines:", lines.length);
    console.log("THE LINES ARE: ", lines);

    // Extract the basic session info from first 4 lines
    const userId = lines[0];
    const sessionId = lines[1];
    const prompt = lines[2];
    const startingTimestamp = parseInt(lines[3]);

    // Process the keystrokes starting from line 4
    const keystrokes = lines
      .slice(4)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [key, delta] = line.trim().split(" ");
        return {
          key,
          delta: parseInt(delta),
        };
      });

    // Calculate total time by adding all deltas plus 8 seconds
    const totalDeltas = keystrokes.reduce(
      (sum, stroke) => sum + stroke.delta,
      0
    );
    const totalTime = totalDeltas + 8000; // Add 8 seconds (8000ms)

    // Calculate other metrics
    const characterCount = keystrokes.filter((k) => k.key.length === 1).length;
    const backspaces = keystrokes.filter((k) => k.key === "Backspace").length;
    const spaces = keystrokes.filter((k) => k.key === " ").length;
    const wordCount = spaces + 1;

    console.log("user id", userId);
    console.log("WORD COUNT:", wordCount);
    console.log("TOTAL TIME:", totalTime);
    console.log("AVERAGE WPM:", wordCount / (totalTime / 60000));

    setSessionData({
      text: writingString,
      totalDuration: totalTime,
      wordCount,
      averageWPM: wordCount / (totalTime / 60000),
    });

    const processedSession = {
      sessionId,
      prompt,
      startingTimestamp,
      metrics: {
        totalTimeMs: totalTime,
        characterCount,
        backspaces,
        wordCount,
        averageTimeBetweenKeystrokes: totalDeltas / keystrokes.length,
      },
      keystrokes,
    };

    return processedSession;
  }
  return (
    <View className="flex-1 items-center justify-center bg-black p-5">
      <View className="w-full items-center mb-8">
        <Text className="text-5xl font-bold text-white">
          {sessionData?.wordCount || 0}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">TOTAL WORDS</Text>
      </View>

      <View className="w-full items-center mb-8">
        <Text className="text-4xl font-bold text-white">
          {Math.floor((sessionData?.totalDuration || 0) / 1000 / 60)}:
          {Math.floor(((sessionData?.totalDuration || 0) / 1000) % 60)
            .toString()
            .padStart(2, "0")}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">TIME</Text>
      </View>

      <View className="w-full items-center mb-8">
        <Text className="text-4xl font-bold text-white">
          {Math.round(sessionData?.averageWPM || 0)}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">AVERAGE WPM</Text>
      </View>

      <TouchableOpacity
        //onPress={onNextStep
        onPress={funFunction}
        className="w-full flex-row items-center justify-center bg-white rounded-lg py-4 mb-4"
      >
        <MaterialCommunityIcons name="reload" size={24} color="black" />
        <Text className="text-black text-center font-bold text-lg ml-2">
          Try Again
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        //onPress={onNextStep
        onPress={printLocalStorage}
        className="w-full flex-row items-center justify-center bg-white rounded-lg py-4 mb-4"
      >
        <MaterialCommunityIcons name="reload" size={24} color="black" />
        <Text className="text-black text-center font-bold text-lg ml-2">
          printttt
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        //onPress={onNextStep
        onPress={clearAllUserDataFromLocalStorage}
        className="w-full flex-row items-center justify-center bg-white rounded-lg py-4 mb-4"
      >
        <MaterialCommunityIcons name="reload" size={24} color="black" />
        <Text className="text-black text-center font-bold text-lg ml-2">
          delete it all
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        //onPress={onNextStep
        onPress={() => {
          setIsWritingGameVisible(false);
          setDidUserWriteToday(true);
          router.push("/(tabs)/anky");
        }}
        className="w-full flex-row items-center justify-center bg-white rounded-lg py-4 mb-4"
      >
        <MaterialCommunityIcons name="reload" size={24} color="black" />
        <Text className="text-black text-center font-bold text-lg ml-2">
          tabs
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: 40,
    right: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#333",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#000",
  },
  lifeBar: {
    height: "20%",
  },
  progressBar: {
    height: "80%",
  },

  timerContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  timerText: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Righteous-Regular",
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Righteous-Regular",
    marginBottom: 20,
    textAlign: "center",
  },
  messageContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  message: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Righteous-Regular",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#fff",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: "#000",
    fontSize: 18,
    fontFamily: "Righteous-Regular",
  },
  progressContainer: {
    width: "80%",
    height: 10,
    backgroundColor: "#333",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 20,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  stats: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Righteous-Regular",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 20,
  },
  growthContainer: {
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  celebrationContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  statsContainer: {
    alignItems: "center",
    width: "100%",
  },
  flowMessage: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Righteous-Regular",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 20,
  },
  mandala: {
    width: width * 0.8,
    height: width * 0.8,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircle: {
    width: "100%",
    height: "100%",
    borderRadius: width * 0.4,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    backgroundColor: "#0B1026",
    borderRadius: width * 0.4,
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationAnim: {
    width: "100%",
    height: "100%",
  },
});

export { WritingProgressBar };
