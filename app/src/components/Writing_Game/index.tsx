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
  TouchableOpacity,
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
import { useTranslation } from "react-i18next";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { prettyLog } from "@/src/app/lib/logs";
import { storeUserWritingSessionLocally } from "@/src/app/lib/writingGame";
import { getCurrentAnkyverseDay } from "@/src/app/lib/ankyverse";
import {
  addWritingSessionToLocalStorageSimple,
  updateWritingSessionOnLocalStorageSimple,
} from "@/src/app/lib/simple_writing_game";
import MusicIcon from "@/assets/icons/music.svg";

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
    musicButtonPressed,
  } = useAnky();
  const { ankyUser } = useUser();

  const [ankyPromptStreaming, setAnkyPromptStreaming] = useState<string>("");
  const [text, setText] = useState("");
  const [ankyResponses, setAnkyResponses] = useState<string[]>([]);
  const [newAnkyPrompt, setNewAnkyPrompt] = useState<string | null>(null);

  // Writing game elements
  const [keystrokes, setKeystrokes] = useState<string>("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOpacity = useSharedValue(1);
  const [ankyResponseReady, setAnkyResponseReady] = useState(false);
  const [timeSinceLastKeystroke, setTimeSinceLastKeystroke] = useState(0);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [writingSessionId, setWritingSessionId] = useState<string>("");
  const [sessionLongString, setSessionLongString] = useState<string>("");
  const keystrokeQueue = useRef<Keystroke[]>([]);
  const processingRef = useRef(false);

  const textInputRef = useRef<TextInput>(null);
  const lastKeystrokeTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  const { t } = useTranslation("self-inquiry");

  const CHAR_DELAY = 50;
  const TIMEOUT_DURATION = 8000;
  const MAX_SESSION_DURATION = 40000;

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
    const streamPrompt = async () => {
      let currentIndex = 0;
      let prompt =
        (await AsyncStorage.getItem("upcoming_prompt")) ??
        t("self-inquiry:upcoming_prompt");
      const interval = setInterval(() => {
        if (prompt && currentIndex < prompt.length) {
          setAnkyPromptStreaming(prompt.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, CHAR_DELAY);

      return () => clearInterval(interval);
    };

    streamPrompt();
  }, []);

  const handleSessionEnded = async () => {
    try {
      setWritingSession({
        ...writingSession,
        status: "completed",
      } as WritingSession);
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
    } catch (error) {
      console.error("Error in handleSessionEnded:", error);
      throw error;
    }
  };

  const processKeystrokeQueue = async () => {
    if (processingRef.current || keystrokeQueue.current.length === 0) {
      return;
    }

    processingRef.current = true;

    const keystroke = keystrokeQueue.current.shift();
    if (keystroke && keystroke.key && keystroke.delta) {
      setSessionLongString((prev) => {
        const newString = prev + "\n" + keystroke.key + " " + keystroke.delta;
        updateWritingSessionOnLocalStorageSimple(writingSessionId, newString);
        return newString;
      });
    }

    console.log("Setting processing flag to false");
    processingRef.current = false;

    if (keystrokeQueue.current.length > 0) {
      console.log("More keystrokes in queue, processing next");
      processKeystrokeQueue();
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

  const handleScreenTap = async () => {
    setAnkyResponseReady(false);
    if (!writingSession) {
      // this means the writing session is starting
      const prompt =
        (await AsyncStorage.getItem("upcoming_prompt")) ||
        t("self-inquiry:upcoming_prompt");
      const session_id = uuidv4();
      const now = new Date();
      let newSessionLongString = `${session_id}\n${prompt}\n${now.getTime()}\n`;
      setSessionLongString(newSessionLongString);
      await addWritingSessionToLocalStorageSimple(session_id);
      await updateWritingSessionOnLocalStorageSimple(
        session_id,
        sessionLongString
      );
      setWritingSessionId(session_id);
      // TODO: send the new session to the backend
      sessionStartTime.current = now.getTime();
      lastKeystrokeTime.current = now.getTime();
      setTimeSinceLastKeystroke(0);
      setWritingSession({
        session_id: session_id,
        starting_timestamp: now,
        status: "writing",
      } as WritingSession);
      if (Platform.OS === "ios" || Platform.OS === "android") {
        Keyboard.dismiss();
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      } else {
        textInputRef.current?.focus();
      }
    }
  };

  const handleKeyPress = (e: any) => {
    const currentTime = Date.now();
    setTimeSinceLastKeystroke(0);
    keystrokeQueue.current.push({
      key: e.nativeEvent.key,
      delta: currentTime - (lastKeystrokeTime.current ?? 0),
    });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleSessionEnded, TIMEOUT_DURATION);

    lastKeystrokeTime.current = currentTime;

    processKeystrokeQueue();
  };

  const resetAllWritingGameState = () => {
    setText("");
    setAnkyPromptStreaming("");
    setSessionData(null);
    setAnkyResponses([]);
    setNewAnkyPrompt(null);
    setKeystrokes("");
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
    if (!writingSession) {
      return (
        <TouchableWithoutFeedback onPress={handleScreenTap}>
          <View className="flex-1 items-center justify-center px-10 pb-[100px] android:pb-20">
            <Animated.Text className="text-white text-3xl font-righteous text-center">
              {ankyPromptStreaming.split("").map((letter, index) => (
                <Animated.Text key={index} className="text-white">
                  {letter}
                </Animated.Text>
              ))}
              <Animated.Text className="text-white text-3xl font-righteous">
                |
              </Animated.Text>
            </Animated.Text>
          </View>
        </TouchableWithoutFeedback>
      );
    }
    switch (writingSession?.status) {
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
              autoCorrect={false}
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
            session_id={writingSessionId}
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
          />
        );
    }
  };
  if (!ankyUser) {
    return (
      <View className="flex-1 bg-black">
        <Text>Loading...</Text>
      </View>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-black">{renderContent()}</SafeAreaView>
  );
};

export default WritingGame;
