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
  Vibration,
} from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  interpolate,
  withSpring,
  Easing,
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
import { SessionData, Keystroke } from "@/src/types/WritingGame";
import { prettyLog } from "./lib/logs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { clearAllUserDataFromLocalStorage } from "./lib/development";

const { width, height } = Dimensions.get("window");

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const WritingGame = () => {
  const glowIntensity = useSharedValue(1);
  const scaleText = useSharedValue(1);
  const { currentAnky } = useAnky();
  const { anonymousId }: { anonymousId: string | null } = useUser();
  const [writingSession, setWritingSession] = useState<WritingSession>({
    session_id: "",
    session_index_for_user: 0,
    user_id: anonymousId || "",
    starting_timestamp: new Date(),
    ending_timestamp: null,
    prompt: "tell me who you are",
    writing: "",
    words_written: 0,
    newen_earned: 0,
    is_onboarding: true,
    time_spent: 0,
    is_anky: false,
    parent_anky_id: null,
    anky_response: null,
    status: "intro",
    anky_id: null,
    anky: null,
    writing_patterns: undefined,
    keystroke_data: [],
  });
  const [introText, setIntroText] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [text, setText] = useState("");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [ankyResponses, setAnkyResponses] = useState<string[]>([]);

  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOpacity = useSharedValue(1);
  const [ankyResponseReady, setAnkyResponseReady] = useState(false);

  const [timeSinceLastKeystroke, setTimeSinceLastKeystroke] = useState(0);

  const textInputRef = useRef<TextInput>(null);
  const lastKeystrokeTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  const CHAR_DELAY = 50;
  const TIMEOUT_DURATION = 8000; // 8 seconds
  const MAX_SESSION_DURATION = 8000; // 480 seconds (8 minutes)

  // const MAX_SESSION_DURATION = 480000; // 480 seconds (8 minutes)

  useEffect(() => {
    clearAllUserDataFromLocalStorage();
  }, []);

  useEffect(() => {
    if (writingSession.status === "intro") {
      // Cursor blink animation (existing)
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );

      // Add pulsing glow effect
      glowIntensity.value = withRepeat(
        withSequence(
          withTiming(1.5, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );

      // Subtle scale animation
      scaleText.value = withRepeat(
        withSequence(withSpring(1.05), withSpring(1)),
        -1,
        true
      );
    }
  }, [writingSession]);

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

  const animatedTextStyle = useAnimatedProps(() => ({
    transform: [{ scale: scaleText.value }],
    textShadowColor: `rgba(255,255,255,${interpolate(
      glowIntensity.value,
      [1, 1.5],
      [0.75, 0.9]
    )})`,
    textShadowRadius: interpolate(glowIntensity.value, [1, 1.5], [10, 20]),
  }));

  useEffect(() => {
    console.log("IN HERE");
    Vibration.vibrate([100, 50, 200, 50, 300, 50, 400]); // Increasing intensity pattern to build excitement
    if (writingSession.status === "intro") {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [writingSession]);

  useEffect(() => {
    if (writingSession.status === "writing") {
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
  }, [writingSession]);

  useEffect(() => {
    if (writingSession.status === "intro") {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < (writingSession?.prompt ?? "").length) {
          setIntroText(
            (writingSession?.prompt ?? "").slice(0, currentIndex + 1)
          );
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, CHAR_DELAY);

      return () => clearInterval(interval);
    }
  }, [writingSession]);

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
      longestPause: Math.max(...keystrokes.map((k) => k.time_delta ?? 0)),
      keystrokes: keystrokes,
    };
  };

  const initializeNewWritingSession = (): WritingSession => {
    const sessionId = uuidv4();
    const newWritingSession: WritingSession = {
      session_id: sessionId,
      session_index_for_user: 0,
      starting_timestamp: new Date(),
      prompt: currentAnky?.anky_inquiry,
      user_id: anonymousId,
      is_onboarding: true,
      status: "writing",
      writing: "",
      words_written: 0,
      newen_earned: 0,
      time_spent: 0,
      is_anky: false,
      parent_anky_id: null,
      anky_response: null,
      ending_timestamp: null,
      anky_id: null,
      anky: null,
      writing_patterns: undefined,
      keystroke_data: [],
    };
    setText("");
    setWritingSession(newWritingSession);
    setInitialized(true);
    return newWritingSession;
  };

  const handleSessionEnded = async (data: SessionData) => {
    try {
      const endedWritingSession = {
        ...writingSession,
        status:
          data.totalDuration > MAX_SESSION_DURATION ? "completed" : "failed",
        words_written: data.wordCount,
        time_spent: data.totalDuration,
        writing: data.text,
        ending_timestamp: new Date(),
        is_anky: data.totalDuration >= MAX_SESSION_DURATION ? true : false,
        keystroke_data: keystrokes,
      };
      prettyLog(endedWritingSession, "The ended session data is: ");

      console.log("Session data set");

      const writingAttempts = await AsyncStorage.getItem("writing_attempts");
      console.log(
        "Retrieved writing attempts from localStorage:",
        writingAttempts
      );

      prettyLog(writingAttempts, "THE WRITING ATTEMPTS ARE: ");

      setWritingSession(endedWritingSession as WritingSession);

      const newWritingAttempts = [
        ...(writingAttempts ? JSON.parse(writingAttempts) : []),
        endedWritingSession,
      ];

      prettyLog(newWritingAttempts, "THE NEW WRITING ATTEMPTS ARE: ");

      await AsyncStorage.setItem(
        "writing_attempts",
        JSON.stringify(newWritingAttempts)
      );
      console.log("Saved new writing attempts to localStorage");

      console.log("****************************************************");

      if (endedWritingSession.is_anky) {
        console.log("Duration >= 480, user is ready");
        prettyLog(
          endedWritingSession,
          "THE USER IS READY, MOVE ON TO THE NEXT PHASE"
        );
      } else {
        console.log("Duration < 480, user not ready");
        prettyLog(
          endedWritingSession,
          "THE USER IS NOT READY, KEEP THEM IN THE GAME"
        );
        console.log("Writing session ended");
        await getOnboardingResponse(newWritingAttempts);
      }
      await endWritingSession(
        endedWritingSession,
        "ENDING THE WRITING SESSION"
      );
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
      setAnkyResponseReady(true);
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
      const stats = calculateStats(text, keystrokes);
      const writingPatterns = {
        average_speed: stats.averageWPM,
        longest_pause: stats.longestPause,
        speed_variations: [],
        pause_points: [],
        flow_state_ranges: [],
      };
      const sessionStats: SessionData = {
        text,
        startTime: sessionStartTime.current!,
        endReason: "timeout",
        keystrokes: keystrokes,
        totalDuration: stats.totalDuration ?? 0,
        longestPause: stats.longestPause ?? 0,
        wordCount: stats.wordCount ?? 0,
        averageWPM: stats.averageWPM ?? 0,
      };
      setSessionData(sessionStats);

      handleSessionEnded(sessionStats);
    } else {
      alert("you didn't write anything wtf");
    }
  };

  const handleScreenTap = () => {
    setAnkyResponseReady(false);
    if (writingSession.status !== "writing") {
      try {
        const newWritingSession = initializeNewWritingSession();
        startWritingSession(newWritingSession, "");
        prettyLog(newWritingSession, "STARTING A NEW WRITING SESSION");
        sessionStartTime.current = Date.now();
        lastKeystrokeTime.current = Date.now();
        setTimeSinceLastKeystroke(0);
        setKeystrokes([]); // Reset keystrokes for new session

        if (Platform.OS === "ios" || Platform.OS === "android") {
          Keyboard.dismiss();
          setTimeout(() => {
            textInputRef.current?.focus();
          }, 100);
        } else {
          textInputRef.current?.focus();
        }
      } catch (error) {
        console.error("The writing session failed to start: MAYDAY", error);
      }
    }
  };

  const handleKeyPress = (e: any) => {
    const currentTime = Date.now();
    setTimeSinceLastKeystroke(0);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleTimeout, TIMEOUT_DURATION);

    const timeDelta = lastKeystrokeTime.current
      ? currentTime - lastKeystrokeTime.current
      : 0;

    lastKeystrokeTime.current = currentTime;

    const keystrokeEvent: Keystroke = {
      session_id: writingSession.session_id ?? "",
      key: e.nativeEvent.key,
      timestamp: currentTime,
      time_delta: timeDelta,
    };

    setKeystrokes((prev) => [...prev, keystrokeEvent]);
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
    switch (writingSession.status) {
      case "intro":
        return (
          <TouchableWithoutFeedback onPress={handleScreenTap}>
            <View className="flex-1 items-center justify-center px-10 pb-[100px] android:pb-20">
              <Text
                className="text-white text-3xl font-righteous text-center"
                style={{
                  textShadowColor: "rgba(255,255,255,0.75)",
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                }}
              >
                {introText}
                <Animated.Text
                  className="text-white text-3xl font-righteous"
                  style={[
                    animatedCursorProps,
                    {
                      textShadowColor: "rgba(255,255,255,0.75)",
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 10,
                    },
                  ]}
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
            {writingSession.status === "writing" && (
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
              onKeyPress={handleKeyPress}
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
            ankyResponseReady={ankyResponseReady}
            onRetry={handleScreenTap}
          />
        );

      case "completed":
        return (
          <CompleteSessionScreen
            sessionData={sessionData!}
            onNextStep={() => router.push("/(tabs)/profile")}
            ankyResponseReady={ankyResponseReady}
          />
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">{renderContent()}</SafeAreaView>
  );
};

export default WritingGame;
