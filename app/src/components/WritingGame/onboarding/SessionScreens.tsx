// SessionScreens.tsx
import React, { useRef, useEffect } from "react";
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
  messageFromAnky: string;
}> = ({ sessionData, onRetry, messageFromAnky }) => {
  return (
    <View style={[styles.container, { backgroundColor: "#ff0000" }]}>
      <Text style={styles.title}>Session Incomplete</Text>
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          {messageFromAnky || "Let's try again and reach the 8 minute mark!"}
          {"\n\n"}
          You wrote for {Math.round(sessionData.totalDuration / 1000)} seconds
          {"\n"}
          Expressing {sessionData.wordCount} words
          {"\n"}
          At {sessionData.averageWPM} words per minute
          {"\n\n"}
          The magic happens after 8 minutes!
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
  return (
    <View style={[styles.container, { backgroundColor: "#00ff00" }]}>
      <Text style={styles.title}>Session Complete!</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.message}>
          You stayed present for {Math.round(sessionData.totalDuration / 1000)}{" "}
          seconds
          {"\n"}
          Expressing {sessionData.wordCount} words
          {"\n"}
          At {sessionData.averageWPM} words per minute
          {"\n\n"}
          Great job completing your session!
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onNextStep}>
        <Text style={styles.buttonText}>Next Steps</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export { WritingProgressBar };
