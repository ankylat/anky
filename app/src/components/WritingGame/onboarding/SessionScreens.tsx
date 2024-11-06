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
  onRetry: () => void;
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

// Short Session Screen (< 30s)
export const ShortSessionScreen: React.FC<SessionScreenProps> = ({
  sessionData,
  onRetry,
}) => {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0);
    opacity.value = withDelay(500, withSpring(1));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.emoji}>🌱</Text>
      <Text style={styles.title}>A Seed is Planted!</Text>
      <Animated.View style={[styles.messageContainer, fadeInStyle]}>
        <Text style={styles.message}>
          Every journey begins with a single word.{"\n"}
          You wrote for {Math.round(sessionData.totalDuration / 1000)} seconds.
          {"\n"}
          Try staying with your thoughts a bit longer.{"\n"}
          The magic happens after 8 minutes!
        </Text>
      </Animated.View>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Plant Another Seed</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Medium Session Screen (30s - 480s)
export const MediumSessionScreen: React.FC<SessionScreenProps> = ({
  sessionData,
  onRetry,
}) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const wordOpacity = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(sessionData.totalDuration / 480000, {
      duration: 1500,
    });
    scale.value = withSpring(1);
    wordOpacity.value = withDelay(1000, withSpring(1));
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["#4b0082", "#00ff00"]
    ),
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌿</Text>
      <Animated.View style={[styles.growthContainer, scaleStyle]}>
        <Text style={styles.title}>Growing Stronger!</Text>
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, progressStyle]} />
        </View>
        <Animated.View style={wordStyle}>
          <Text style={styles.stats}>
            {sessionData.wordCount} words flowed through you{"\n"}
            at {sessionData.averageWPM} words per minute
          </Text>
        </Animated.View>
      </Animated.View>
      <Text style={styles.message}>
        You're building momentum!{"\n"}
        Just {480 - Math.round(sessionData.totalDuration / 1000)} seconds more
        to reach flow state
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Keep Growing</Text>
      </TouchableOpacity>
    </View>
  );
};

// Long Session Screen (> 480s)
export const LongSessionScreen: React.FC<SessionScreenProps> = ({
  sessionData,
  onRetry,
}) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 80,
    });
    rotate.value = withSequence(
      withTiming(360, { duration: 1000 }),
      withSpring(0)
    );
    statsOpacity.value = withDelay(1200, withSpring(1));
  }, []);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [
      { translateY: interpolateColor(statsOpacity.value, [0, 1], [20, 0]) },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.celebrationContainer, celebrationStyle]}>
        <Text style={styles.emoji}>🌳</Text>
        <Text style={styles.title}>Flow State Achieved!</Text>
      </Animated.View>
      <Animated.View style={[styles.statsContainer, statsStyle]}>
        <Text style={styles.flowMessage}>
          You stayed present for {Math.round(sessionData.totalDuration / 1000)}{" "}
          seconds{"\n"}
          Expressing {sessionData.wordCount} words of pure consciousness{"\n"}
          Flowing at {sessionData.averageWPM} words per minute
        </Text>
        <Text style={styles.message}>
          This is the state where magic happens.{"\n"}
          Your mind and heart are in perfect harmony.
        </Text>
      </Animated.View>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Flow Again</Text>
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
