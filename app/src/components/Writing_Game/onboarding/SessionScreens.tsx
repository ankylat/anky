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

const { height, width } = Dimensions.get("window");

interface SessionData {
  text: string;
  totalDuration: number;
  wordCount: number;
  averageWPM: number;
}

interface SessionScreenProps {
  sessionData: SessionData;
  onNextStep: () => void;
  ankyResponseReady: boolean;
  elapsedTime: number;
  ankyReflection: string;
}

// Common animated timer component
const AnimatedTimer = ({ duration }: { duration: number }) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );
    scale.value = withRepeat(
      withSequence(withSpring(1.2), withSpring(1)),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.timerContainer, animatedStyle]}>
      <Text style={styles.timerText}>{Math.round(duration / 1000)}s</Text>
    </Animated.View>
  );
};

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
  sessionData: SessionData;
  onNextStep: () => void;
  writingSession: WritingSession;
}> = ({ sessionData, onNextStep, writingSession }) => {
  const { setWritingSession } = useAnky();
  return (
    <View className="flex-1 items-center justify-center bg-black p-5">
      <View className="w-full items-center mb-8">
        <Text className="text-5xl font-bold text-white">
          {sessionData.wordCount}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">TOTAL WORDS</Text>
      </View>

      <View className="w-full items-center mb-8">
        <Text className="text-4xl font-bold text-white">
          {Math.floor(sessionData.totalDuration / 1000 / 60)}:
          {Math.floor((sessionData.totalDuration / 1000) % 60)
            .toString()
            .padStart(2, "0")}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">TIME</Text>
      </View>

      <View className="w-full items-center mb-8">
        <Text className="text-4xl font-bold text-white">
          {Math.round(sessionData.averageWPM)}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">AVERAGE WPM</Text>
      </View>

      {!writingSession.is_anky && (
        <TouchableOpacity
          onPress={onNextStep}
          className="w-full flex-row items-center justify-center bg-white rounded-lg py-4 mb-4"
        >
          <MaterialCommunityIcons name="reload" size={24} color="black" />
          <Text className="text-black text-center font-bold text-lg ml-2">
            Try Again
          </Text>
        </TouchableOpacity>
      )}
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
