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
}: {
  timeSinceLastKeystroke: number;
}) => {
  const progress = useSharedValue(1);
  const secondsBetweenKeystrokes = 8;

  useEffect(() => {
    progress.value = withTiming(
      1 - timeSinceLastKeystroke / secondsBetweenKeystrokes,
      {
        duration: 100,
      }
    );
  }, [timeSinceLastKeystroke]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
      backgroundColor: interpolateColor(
        progress.value,
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
      <Animated.View style={[styles.progressBar, animatedStyle]} />
    </View>
  );
};

// Screen for incomplete sessions (< 8 minutes)
export const IncompleteSessionScreen: React.FC<{
  sessionData: SessionData;
  onRetry: () => void;
  ankyResponses: string[];
  ankyResponseReady: boolean;
}> = ({ sessionData, onRetry, ankyResponses, ankyResponseReady }) => {
  const [displayText, setDisplayText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Generate initial random characters on mount
  useEffect(() => {
    const randomChars = Array(88)
      .fill("")
      .map(() => characters[Math.floor(Math.random() * characters.length)])
      .join("");
    setDisplayText(randomChars);
  }, []);

  // Start transformation when ankyResponseReady becomes true
  useEffect(() => {
    if (ankyResponseReady && ankyResponses.length > 0) {
      const finalMessage = ankyResponses[ankyResponses.length - 1];
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < finalMessage.length) {
          setDisplayText((prev) => {
            const newChar = finalMessage[currentIndex];
            return (
              finalMessage.slice(0, currentIndex) +
              newChar +
              prev.slice(currentIndex + 1)
            );
          });
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsLoading(false);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [ankyResponseReady, ankyResponses]);

  return (
    <View style={[styles.container, { backgroundColor: "#ff0000" }]}>
      <View style={styles.messageContainer}>
        <Text
          style={[
            styles.message,
            isLoading && {
              textShadowColor: "rgba(255,255,255,0.5)",
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 10,
            },
          ]}
        >
          {displayText}
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

// Screen for completed sessions (>= 8 minutes)
export const CompleteSessionScreen: React.FC<SessionScreenProps> = ({
  sessionData,
  onNextStep,
}) => {
  const progressSize = Math.min((sessionData.wordCount / 500) * 100, 100);
  const rotateValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    rotateValue.value = withRepeat(
      withTiming(360, { duration: 10000 }),
      -1,
      false
    );
    scaleValue.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotateValue.value}deg` },
      { scale: scaleValue.value },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: "#0B1026" }]}>
      <Animated.View style={[styles.mandala, animatedStyle]}>
        <View style={styles.progressCircle}>
          <View
            style={[
              styles.innerCircle,
              { width: `${progressSize}%`, height: `${progressSize}%` },
            ]}
          >
            {/* TODO: Import and use LottieView properly */}
            <View style={styles.celebrationAnim} />
          </View>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.floatingButton} onPress={onNextStep}>
        <MaterialCommunityIcons name="arrow-right" size={32} color="#00FFFF" />
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
  progressBar: {
    height: "100%",
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
