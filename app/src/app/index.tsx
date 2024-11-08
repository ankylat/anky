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
  IncompleteSessionScreen,
  CompleteSessionScreen,
} from "../components/WritingGame/onboarding/SessionScreens";
import { useAnky } from "../context/AnkyContext";
import { WritingSession } from "../types/Anky";
import { useUser } from "../context/UserContext";
import { processInitialWritingSessions } from "../api/anky";
import {
  endWritingSession,
  onboardingSessionProcessing,
  startWritingSession,
} from "@/src/api/game";
import { GameState, SessionData, Keystroke } from "@/src/types/WritingGame";
import { prettyLog } from "./lib/user";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const WritingGame = () => {
  const { userWritingSessions, setUserWritingSessions } = useAnky();
  const { anonymousId }: { anonymousId: string | null } = useUser();
  const [gameState, setGameState] = useState<GameState>({
    status: "intro",
    session_id: uuidv4(),
    game_over: false,
    words_written: 0,
    session_index_for_user: 0,
    time_spent: 0,
    starting_timestamp: new Date(),
    prompt: "",
    user_id: "",
    is_session_active: false,
    came_back_to_read: false,
    session_started: false,
    target_reached: false,
    display_seconds: true,
    current_mode: "center",
    keyboard_height: 0,
    is_onboarding: true,
    text: "",
    ending_timestamp: null,
  });
  const [introText, setIntroText] = useState("");
  const [text, setText] = useState("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [ankyResponses, setAnkyResponses] = useState<string[]>([]);

  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOpacity = useSharedValue(1);
  const [prompt, setPrompt] = useState("tell me who you are");

  const [timeSinceLastKeystroke, setTimeSinceLastKeystroke] = useState(0);

  const textInputRef = useRef<TextInput>(null);
  const lastKeystrokeTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  const CHAR_DELAY = 50;
  const TIMEOUT_DURATION = 8000; // 8 seconds
  const MAX_SESSION_DURATION = 480000; // 480 seconds (8 minutes)
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
    if (gameState.status === "intro") {
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
    if (gameState.status === "writing") {
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
    if (gameState.status === "intro") {
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

  const handleSessionEnded = async (data: SessionData) => {
    try {
      console.log("Starting handleSessionEnded with data:", data);

      setSessionData(data);
      console.log("Session data set");

      prettyLog(data, "THE SESSION DATA IS: ");

      const writingAttempts = await AsyncStorage.getItem("writing_attempts");
      console.log(
        "Retrieved writing attempts from localStorage:",
        writingAttempts
      );

      prettyLog(writingAttempts, "THE WRITING ATTEMPTS ARE: ");

      const newGameState = {
        ...gameState,
        status:
          data.totalDuration > 479000
            ? ("completed" as const)
            : ("failed" as const),
        words_written: data.wordCount,
        time_spent: data.totalDuration,
        text: data.text,
        ending_timestamp: new Date(),
      };
      console.log("Created new game state:", newGameState);

      setGameState(newGameState);
      console.log("Game state updated");

      const newWritingAttempts = [
        ...(writingAttempts ? JSON.parse(writingAttempts) : []),
        newGameState,
      ];
      await getOnboardingResponse(newWritingAttempts);

      console.log("Created new writing attempts array:", newWritingAttempts);

      prettyLog(newWritingAttempts, "THE NEW WRITING ATTEMPTS ARE: ");

      await AsyncStorage.setItem(
        "writing_attempts",
        JSON.stringify(newWritingAttempts)
      );
      console.log("Saved new writing attempts to localStorage");

      console.log("****************************************************");
      await endWritingSession(newGameState, "ENDING THE WRITING SESSION");

      if (data.totalDuration >= MAX_SESSION_DURATION) {
        console.log("Duration >= 480, user is ready");
        prettyLog("THE USER IS READY, MOVE ON TO THE NEXT PHASE");
      } else {
        console.log("Duration < 480, user not ready");
        prettyLog("THE USER IS NOT READY, KEEP THEM IN THE GAME");
        console.log("Writing session ended");
      }
    } catch (error) {
      console.error("Error in handleSessionEnded:", error);
      throw error;
    }
  };

  const getOnboardingResponse = async (
    newWritingAttempts: WritingSession[]
  ) => {
    try {
      // Get existing responses array from storage
      const existingResponsesStr = await AsyncStorage.getItem(
        "anky_onboarding_responses"
      );
      const existingResponses: string[] = existingResponsesStr
        ? JSON.parse(existingResponsesStr)
        : [];

      // Get new response from API
      const ankyResponse = await onboardingSessionProcessing(
        newWritingAttempts,
        existingResponses
      );
      setAnkyResponses((prev) => [...prev, ankyResponse.reflection]);

      // Add new response to array and save
      const updatedResponses = [...existingResponses, ankyResponse.reflection];
      await AsyncStorage.setItem(
        "anky_onboarding_responses",
        JSON.stringify(updatedResponses)
      );
    } catch (error) {
      console.error("Error in getOnboardingResponse:", error);
      throw error;
    }
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

      handleSessionEnded({
        text,
        startTime: sessionStartTime.current!,
        endReason: "timeout",
        ...stats,
      } as SessionData);
    }
  };

  const handleScreenTap = () => {
    if (gameState.status !== "writing") {
      console.log("IN HERE THE ANONYMOUS ID IS: ", anonymousId);
      const thisWritingSession = {
        session_id: uuidv4(),
        status: "writing",
        session_index_for_user: (userWritingSessions?.length ?? 0) + 1,
        starting_timestamp: new Date(),
        prompt: prompt,
        user_id: anonymousId,
        is_onboarding: true,
      };
      setGameState({
        ...gameState,
        status: "writing",
        session_id: thisWritingSession.session_id,
        session_index_for_user: thisWritingSession.session_index_for_user,
        starting_timestamp: thisWritingSession.starting_timestamp,
        prompt: thisWritingSession.prompt,
        user_id: anonymousId || "",
      });

      startWritingSession(thisWritingSession, "");
      prettyLog(thisWritingSession, "STARTING A NEW WRITING SESSION");
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
    switch (gameState.status) {
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
            {gameState.status === "writing" && (
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

      case "failed":
        return (
          <IncompleteSessionScreen
            ankyResponses={ankyResponses}
            sessionData={sessionData!}
            onRetry={handleScreenTap}
          />
        );

      case "completed":
        return (
          <CompleteSessionScreen
            sessionData={sessionData!}
            onNextStep={() => {}}
          />
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">{renderContent()}</SafeAreaView>
  );
};

export default WritingGame;
