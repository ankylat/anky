import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Vibration,
} from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { v4 as uuidv4 } from "uuid";
import { Keystroke } from "@/src/types/Anky";
import { useAnky } from "@/src/context/AnkyContext";
import { useUser } from "@/src/context/UserContext";
import { WritingSession, Anky, SessionData } from "@/src/types/Anky";
import {
  WritingProgressBar,
  SessionEndScreen,
} from "./onboarding/SessionScreens";
import { endWritingSession, startWritingSession } from "@/src/api/game";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { prettyLog } from "@/src/app/lib/logs";
import { storeUserWritingSessionLocally } from "@/src/app/lib/writingGame";
import { getCurrentAnkyverseDay } from "@/src/app/lib/ankyverse";

const { width, height } = Dimensions.get("window");

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const WritingGame = () => {
  const glowIntensity = useSharedValue(1);
  const scaleText = useSharedValue(1);
  const {
    writingSession,
    setWritingSession,
    setIsWritingGameVisible,
    setDidUserWriteToday,
  } = useAnky();
  const { ankyUser } = useUser();

  const [ankyPromptStreaming, setAnkyPromptStreaming] = useState<string>("");
  const [text, setText] = useState("");
  const [ankyResponses, setAnkyResponses] = useState<string[]>([]);
  const [newAnkyPrompt, setNewAnkyPrompt] = useState<string | null>(null);

  // Writing game elements
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOpacity = useSharedValue(1);
  const [ankyResponseReady, setAnkyResponseReady] = useState(false);
  const [timeSinceLastKeystroke, setTimeSinceLastKeystroke] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const textInputRef = useRef<TextInput>(null);
  const lastKeystrokeTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  const CHAR_DELAY = 50;
  const TIMEOUT_DURATION = 8000;
  const MAX_SESSION_DURATION = 20000;

  useEffect(() => {
    if (writingSession?.status === "anky-prompt") {
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
    if (writingSession?.status === "anky-prompt") {
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
    if (writingSession?.status === "writing") {
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
    if (writingSession?.status === "anky-prompt") {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < (writingSession?.prompt ?? "").length) {
          setAnkyPromptStreaming(
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

  const handleSessionEnded = async (data: SessionData) => {
    try {
      const endedWritingSession = {
        ...writingSession,
        status: "completed",
        words_written: data.wordCount,
        time_spent: data.totalDuration,
        writing: data.text,
        ending_timestamp: new Date(),
        is_anky: data.totalDuration >= MAX_SESSION_DURATION ? true : false,
        keystroke_data: keystrokes,
        anky_id: data.totalDuration > MAX_SESSION_DURATION ? uuidv4() : null,
      };
      setWritingSession(endedWritingSession as WritingSession);
      prettyLog(endedWritingSession, "The ended session data is: ");

      let newWritingSessions: WritingSession[] = [];

      if (!endedWritingSession.is_anky) {
        newWritingSessions = await storeUserWritingSessionLocally(
          endedWritingSession as WritingSession
        );
        prettyLog(newWritingSessions, "THE NEW DRAFTS ARE: ");
      }

      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");

      if (endedWritingSession.is_anky) {
        console.log("Duration >= 480, user is ready");
        prettyLog(
          endedWritingSession,
          "THE USER IS READY, MOVE ON TO THE NEXT PHASE"
        );
        const newAnky = [
          {
            id: endedWritingSession.anky_id,
            user_id: ankyUser?.id,
            writing_session_id: endedWritingSession.session_id,
            prompt: endedWritingSession.prompt,
            anky_reflection: "",
            image_url: "@/assets/images/anky.png",
            status: "sent-to-backend",
          } as Anky,
        ];
      } else {
        console.log("Duration < 480, user not ready");
        prettyLog(
          endedWritingSession,
          "THE USER IS NOT READY, KEEP THEM IN THE GAME"
        );
        console.log("Writing session ended");
        await getAnkyResponse(newWritingSessions);
      }
      // const response = await endWritingSession(
      //   endedWritingSession,
      //   "ENDING THE WRITING SESSION"
      // );
      // prettyLog(response, "THE RESPONSE FROM ENDING THE WRITING SESSION IS: ");
    } catch (error) {
      console.error("Error in handleSessionEnded:", error);
      throw error;
    }
  };

  const getAnkyResponse = async (newDrafts: WritingSession[]) => {
    try {
      // Get existing responses array from storage
      const existingResponsesStr = await AsyncStorage.getItem(
        "anky_onboarding_responses"
      );
      const existingResponses: string[] = existingResponsesStr
        ? JSON.parse(existingResponsesStr)
        : [];

      // Get new response from API
      let ankyResponse: { reflection: string } | undefined;

      if (!writingSession?.is_anky) {
      }
      setAnkyResponseReady(true);
      setAnkyResponses((prev) => [...prev, ankyResponse?.reflection ?? ""]);

      // Add new response to array and save
      const updatedResponses = [
        ...existingResponses,
        ankyResponse?.reflection ?? "",
      ];
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

      const sessionStats: SessionData = {
        text,
        startTime: sessionStartTime.current!,
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
    if (writingSession?.status !== "writing") {
      try {
        writingSession!.starting_timestamp = new Date();

        console.log("STARTING A NEW WRITING SESSION");
        prettyLog(writingSession, "THE WRITING SESSION BEFORE STARTING");
        startWritingSession(writingSession as WritingSession, "");
        prettyLog(writingSession, "STARTING A NEW WRITING SESSION");
        sessionStartTime.current = Date.now();
        lastKeystrokeTime.current = Date.now();
        setWritingSession({
          ...writingSession,
          starting_timestamp: new Date(),
          status: "writing",
        } as WritingSession);
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

  // the user writes
  // the writing session ends
  // we check if the writing session is more than 8 minutes
  // we ask anky on the background for a reflection and a new prompt to the user
  // we display the ending stats
  // we display the anky reflection
  // if it is less than 8 minutes, we display the anky reflection

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
      session_id: writingSession?.session_id ?? "",
      key: e.nativeEvent.key,
      timestamp: currentTime,
      time_delta: timeDelta,
    };

    setKeystrokes((prev) => [...prev, keystrokeEvent]);
  };

  const resetAllWritingGameState = () => {
    setText("");
    setAnkyPromptStreaming("");
    setSessionData(null);
    setAnkyResponses([]);
    setNewAnkyPrompt(null);
    setKeystrokes([]);
    setAnkyResponseReady(false);
    setTimeSinceLastKeystroke(0);
    lastKeystrokeTime.current = null;
    sessionStartTime.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
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
    console.log("RENDERING CONTENT");
    console.log("RENDERING CONTENT");
    console.log(writingSession);
    console.log("RENDERING CONTENT");
    console.log("RENDERING CONTENT");
    switch (writingSession?.status) {
      case "anky-prompt":
        return (
          <TouchableWithoutFeedback onPress={handleScreenTap}>
            <View className="flex-1 items-center justify-center px-10 pb-[100px] android:pb-20">
              <Animated.Text className="text-white text-3xl font-righteous text-center">
                {ankyPromptStreaming}
                <Animated.Text className="text-white text-3xl font-righteous">
                  |
                </Animated.Text>
              </Animated.Text>
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
                elapsedTime={new Date().getTime() - sessionStartTime.current!}
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

      case "completed":
        return (
          <SessionEndScreen
            sessionData={sessionData!}
            onNextStep={() => {
              prettyLog(writingSession, "THIS IS THE WRITING SESSION");
              if (writingSession.is_anky) {
                console.log("INSIDE HERE");
                setIsWritingGameVisible(false);
                setDidUserWriteToday(true);
                const ankyverseDay = getCurrentAnkyverseDay();
                AsyncStorage.setItem(
                  "last_user_wrote",
                  `S${ankyverseDay.currentSojourn}W${ankyverseDay.wink}`
                );
                router.push("/(tabs)/profile");
              } else {
                const newPrompts = [
                  "What makes you feel most alive?",
                  "Describe a moment that changed everything",
                  "What would you do if you weren't afraid?",
                  "Write about your deepest truth",
                  "What do you need to let go of?",
                  "What does freedom mean to you?",
                  "Write about your wildest dream",
                  "What matters most?",
                ];
                resetAllWritingGameState();
                setWritingSession({
                  session_id: uuidv4(),
                  status: "anky-prompt",
                  prompt:
                    newPrompts[Math.floor(Math.random() * newPrompts.length)],
                  session_index_for_user: null,
                  user_id: null,
                  starting_timestamp: new Date(),
                  ending_timestamp: undefined,
                  writing: "",
                  words_written: 0,
                  newen_earned: 0,
                  is_onboarding: null,
                  time_spent: null,
                  is_anky: false,
                  parent_anky_id: null,
                  anky_response: null,
                  anky_id: null,
                  anky: null,
                  session_data: undefined,
                });
              }
            }}
            writingSession={writingSession}
          />
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">{renderContent()}</SafeAreaView>
  );
};

export default WritingGame;
