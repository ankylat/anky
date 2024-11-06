// index.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { v4 as uuidv4 } from "uuid";

// These would be your separate result screen components
import {
  WritingProgressBar,
  ShortSessionScreen,
  MediumSessionScreen,
  LongSessionScreen,
} from "../components/WritingGame/onboarding/SessionScreens";
import { useAnky } from "../context/AnkyContext";
import { WritingSession } from "../types/Anky";
import { useUser } from "../context/UserContext";

const { width, height } = Dimensions.get("window");

interface Keystroke {
  key?: string;
  timestamp?: number;
  timeSinceLastKeystroke?: number;
}

interface SessionData {
  text: string;
  startTime: number;
  keystrokes: Keystroke[];
  totalDuration: number;
  longestPause: number;
  wordCount: number;
  averageWPM: number;
  endReason: "timeout" | "completed";
}

type GameState = "intro" | "writing" | "short" | "medium" | "long";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const WritingGame = () => {
  const { userWritingSessions, setUserWritingSessions } = useAnky();
  const { anonymousId } = useUser();
  const [gameState, setGameState] = useState<GameState>("intro");
  const [introText, setIntroText] = useState("");
  const [text, setText] = useState("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [writingSession, setWritingSession] = useState<WritingSession | null>(
    null
  );
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOpacity = useSharedValue(1);
  const [prompt, setPrompt] = useState("tell us who you are");

  const [timeSinceLastKeystroke, setTimeSinceLastKeystroke] = useState(0);

  const textInputRef = useRef<TextInput>(null);
  const lastKeystrokeTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  const CHAR_DELAY = 50;
  const TIMEOUT_DURATION = 8000; // 8 seconds
  const MAX_SESSION_DURATION = 180000; // 180 seconds (3 minutes)
  const SHORT_SESSION_THRESHOLD = MAX_SESSION_DURATION * 0.3; // 30 seconds

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  useEffect(() => {
    if (gameState === "intro") {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "writing") {
      const interval = setInterval(() => {
        const currentTime = Date.now();
        if (lastKeystrokeTime.current) {
          setTimeSinceLastKeystroke(
            (currentTime - lastKeystrokeTime.current) / 1000
          );
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "intro") {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < prompt.length) {
          setIntroText(prompt.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, CHAR_DELAY);

      return () => clearInterval(interval);
    }
  }, [gameState]);

  const calculateStats = (
    currentText: string,
    keystrokes: Keystroke[]
  ): Partial<SessionData> => {
    const words = currentText.trim().split(/\s+/).filter(Boolean).length;
    const duration = Date.now() - sessionStartTime.current!;
    const minutes = duration / 60000;

    return {
      wordCount: words,
      averageWPM: Math.round(words / minutes),
      totalDuration: duration,
      longestPause: Math.max(
        ...keystrokes.map((k) => k.timeSinceLastKeystroke ?? 0)
      ),
      keystrokes,
    };
  };

  const determineEndScreen = (duration: number): GameState => {
    if (duration < SHORT_SESSION_THRESHOLD) return "short";
    if (duration < MAX_SESSION_DURATION) return "medium";
    return "long";
  };

  const handleSessionEnded = (data: SessionData) => {
    setSessionData(data);

    const nextScreen = determineEndScreen(data.totalDuration);
    setGameState(nextScreen);
  };

  const handleTimeout = () => {
    if (text.length > 0) {
      const stats = calculateStats(text, []);
      const writingPatterns = {
        average_speed: stats.averageWPM,
        longest_pause: stats.longestPause,
        speed_variations: [],
        pause_points: [],
        flow_state_ranges: [],
      };
      const thisWritingSession = {
        ...writingSession,
        ending_timestamp: new Date(),
        words_written: stats.wordCount,
        time_spent: stats.totalDuration,
        status: "completed",
        writingPatterns,
        keystroke_data: stats.keystrokes,
      };
      setUserWritingSessions([
        ...userWritingSessions,
        {
          ...thisWritingSession,
        } as WritingSession,
      ]);

      handleSessionEnded({
        text,
        startTime: sessionStartTime.current!,
        endReason: "timeout",
        ...stats,
      } as SessionData);
    }
  };

  const handleScreenTap = () => {
    if (
      gameState === "intro" ||
      gameState === "short" ||
      gameState === "medium" ||
      gameState === "long"
    ) {
      setGameState("writing");
      setWritingSession({
        session_id: uuidv4(),
        session_index_for_user: (userWritingSessions?.length ?? 0) + 1,
        user_id: anonymousId,
        starting_timestamp: new Date(),
        prompt: prompt,
        status: "writing",
      });
      sessionStartTime.current = Date.now();
      lastKeystrokeTime.current = Date.now();
      setText("");
      setSessionData(null);
      setTimeSinceLastKeystroke(0);

      if (Platform.OS === "ios" || Platform.OS === "android") {
        Keyboard.dismiss();
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      } else {
        textInputRef.current?.focus();
      }

      sessionTimeoutRef.current = setTimeout(() => {
        Alert.alert("Time Check!", "You've been writing for 8 minutes! 🎉", [
          { text: "Keep Writing!", style: "default" },
        ]);
      }, MAX_SESSION_DURATION);
    }
  };

  const handleKeyPress = () => {
    const currentTime = Date.now();
    setTimeSinceLastKeystroke(0);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleTimeout, TIMEOUT_DURATION);

    const timeSinceLastKeystroke = lastKeystrokeTime.current
      ? currentTime - lastKeystrokeTime.current
      : 0;

    lastKeystrokeTime.current = currentTime;

    // TODO: RECEIVE THE KEYSTROKE INFORMATION AND STORE IT
    const keystroke: Keystroke = {
      timestamp: currentTime,
      timeSinceLastKeystroke,
    };
    setKeystrokes((prev) => [...prev, keystroke]);

    return {
      timestamp: currentTime,
      timeSinceLastKeystroke,
    };
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, []);

  const animatedCursorProps = useAnimatedProps(() => ({
    opacity: cursorOpacity.value,
  }));

  const renderContent = () => {
    switch (gameState) {
      case "intro":
        return (
          <TouchableWithoutFeedback onPress={handleScreenTap}>
            <View className="flex-1 items-center justify-center px-10 pb-[100px] android:pb-20">
              <Text className="text-white text-3xl font-righteous text-center">
                {introText}
                <Animated.Text
                  className="text-white text-3xl font-righteous"
                  style={animatedCursorProps}
                >
                  |
                </Animated.Text>
              </Text>
            </View>
          </TouchableWithoutFeedback>
        );

      case "writing":
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            className="relative"
          >
            {gameState === "writing" && (
              <WritingProgressBar
                timeSinceLastKeystroke={timeSinceLastKeystroke}
              />
            )}
            <TextInput
              ref={textInputRef}
              className="flex-1 w-full text-white text-2xl font-righteous p-2"
              style={{
                textAlignVertical: "top",
                maxHeight: height - keyboardHeight - 100,
              }}
              value={text}
              onChangeText={setText}
              onKeyPress={() => handleKeyPress()}
              multiline
              autoFocus
              autoCapitalize="none"
              selectionColor="#fff"
              keyboardAppearance="dark"
            />
          </KeyboardAvoidingView>
        );

      case "short":
        return (
          <ShortSessionScreen
            sessionData={sessionData!}
            onRetry={handleScreenTap}
          />
        );

      case "medium":
        return (
          <MediumSessionScreen
            sessionData={sessionData!}
            onRetry={handleScreenTap}
          />
        );

      case "long":
        return (
          <LongSessionScreen
            sessionData={sessionData!}
            onRetry={handleScreenTap}
          />
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">{renderContent()}</SafeAreaView>
  );
};

export default WritingGame;
