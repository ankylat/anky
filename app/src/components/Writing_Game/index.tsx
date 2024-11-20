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
import axios from "axios";
import { Keystroke } from "@/src/types/Anky";
import { useAnky } from "@/src/context/AnkyContext";
import { useUser } from "@/src/context/UserContext";
import { WritingSession, Anky, SessionData } from "@/src/types/Anky";
import { WritingProgressBar, SessionEndScreen } from "./SessionScreens";
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
import {
  extractSessionDataFromLongString,
  getAllUserWrittenAnkysFromLocalStorage,
  sendWritingSessionConversationToAnky,
  updateAllUserWrittenAnkysOnLocalStorage,
} from "@/src/app/lib/anky";
import WritingGameModal from "./WritingGameModal";

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
    conversationWithAnky,
    setIsUserWriting,
    setConversationWithAnky,
    setUserAnkys,
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
  const [writingSessionId, setWritingSessionId] = useState<string>("");
  const [sessionLongString, setSessionLongString] = useState<string>("");
  const [preparingWritingSession, setPreparingWritingSession] = useState(true);
  const [isWritingSessionModalOpen, setIsWritingSessionModalOpen] =
    useState(false);
  const keystrokeQueue = useRef<Keystroke[]>([]);
  const processingRef = useRef(false);

  const textInputRef = useRef<TextInput>(null);
  const lastKeystrokeTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);

  const { t } = useTranslation("self-inquiry");

  const CHAR_DELAY = 33;
  const TIMEOUT_DURATION = 8000;
  const MAX_SESSION_DURATION = 10000;

  useEffect(() => {
    resetAllWritingGameState();
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
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("streaming the prompt");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      let currentIndex = 0;
      let prompt =
        (await AsyncStorage.getItem("upcoming_prompt")) ??
        t("self-inquiry:upcoming_prompt", {
          defaultValue: "tell me who you are",
        });
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("tjhe prompt is", prompt);
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log("****************************************************");
      setConversationWithAnky((prev) => {
        if (prev.length === 0 || prev[prev.length - 1] !== prompt) {
          return [...prev, prompt];
        }
        return prev;
      });
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

    if (preparingWritingSession) {
      streamPrompt();
    }
  }, [preparingWritingSession]);

  const handleSessionEnded = async () => {
    try {
      prettyLog(sessionLongString, "THE WRITING SESSION LONG STRING IS");
      // const options = {
      //   url: `https://scroll.anky.bot/insert/anky/data/${hash_of_content}.txt`,
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-api-key": "",
      //   },
      //   body: JSON.stringify(sessionLongString),
      // };
      // const response = await axios.request(options);
      // console.log("****************************************************");
      // console.log("****************************************************");
      // console.log("****************************************************");
      // console.log("****************************************************");
      // prettyLog(response.data, "THE RESPONSE FROM SCROLL.ANKY.BOT IS");
      // console.log("****************************************************");
      // console.log("****************************************************");
      // console.log("****************************************************");
      // console.log("****************************************************");

      setWritingSession({
        ...writingSession,
        status: "completed",
      } as WritingSession);
      setIsUserWriting(false);
      setDidUserWriteToday(true);

      const elapsedTime =
        new Date().getTime() -
        new Date(writingSession?.starting_timestamp!).getTime();
      prettyLog(elapsedTime, "THE ELAPSED TIME IS");
      console.log("****************************************************");
      console.log("****************************************************");
      console.log(
        "elapsedTime > MAX_SESSION_DURATION",
        elapsedTime > MAX_SESSION_DURATION
      );
      console.log(
        "elapsedTime > MAX_SESSION_DURATION",
        elapsedTime > MAX_SESSION_DURATION
      );
      console.log(
        "elapsedTime > MAX_SESSION_DURATION",
        elapsedTime > MAX_SESSION_DURATION
      );
      console.log(
        "elapsedTime > MAX_SESSION_DURATION",
        elapsedTime > MAX_SESSION_DURATION
      );

      console.log("****************************************************");
      console.log("****************************************************");
      if (elapsedTime > MAX_SESSION_DURATION) {
        setDidUserWriteToday(true);
        console.log("this means that the anky is ready");
        setWritingSession({
          ...writingSession,
          status: "completed",
          is_anky: true,
        } as WritingSession);
        const new_user_ankys = await updateAllUserWrittenAnkysOnLocalStorage(
          writingSession?.session_id!
        );
        prettyLog(new_user_ankys, "THE NEW USER ANKYS ARE");
      }
      const newConversation = [...conversationWithAnky, sessionLongString];
      setConversationWithAnky(newConversation);
      const anky_new_prompt = await sendWritingSessionConversationToAnky(
        newConversation
      );
      console.log("setting the async storage with the new prompt");
      AsyncStorage.setItem("upcoming_prompt", anky_new_prompt);
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
        const newString =
          prev +
          "\n" +
          keystroke.key +
          " " +
          (keystroke?.delta! / 1000).toFixed(3);
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

  const handleScreenTap = async () => {
    setWritingSession({
      ...writingSession,
      status: "writing",
      starting_timestamp: new Date(),
    } as WritingSession);
    setTimeout(() => {
      openWritingGameInSessionModal(
        new Date().getTime() - sessionStartTime.current!
      );
    }, 10 * 1000);
    setTimeout(() => {
      openWritingGameInSessionModal(
        new Date().getTime() - sessionStartTime.current!
      );
    }, 4 * 60 * 1000);
    setTimeout(() => {
      openWritingGameInSessionModal(
        new Date().getTime() - sessionStartTime.current!
      );
    }, 6 * 60 * 1000);
    setPreparingWritingSession(false);
    setAnkyResponseReady(false);
    if (!writingSession) {
      // this means the writing session is starting
      setIsUserWriting(true);
      let prompt =
        (await AsyncStorage.getItem("upcoming_prompt")) ??
        t("self-inquiry:upcoming_prompt", {
          defaultValue: "tell me who you are",
        });
      const session_id = uuidv4();
      const now = new Date();
      let newSessionLongString = `${
        ankyUser?.id
      }\n${session_id}\n${prompt}\n${now.getTime()}\n`;
      setSessionLongString(newSessionLongString);
      await addWritingSessionToLocalStorageSimple(session_id);
      await updateWritingSessionOnLocalStorageSimple(
        session_id,
        sessionLongString
      );
      setWritingSessionId(session_id);

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

  async function openWritingGameInSessionModal(elapsedTime: number) {
    prettyLog(elapsedTime, "THE ELAPSED TIME (in seconds) IS");
  }

  const resetAllWritingGameState = () => {
    setText("");
    setSessionLongString("");
    setAnkyPromptStreaming("");
    setAnkyResponses([]);
    setNewAnkyPrompt(null);
    setKeystrokes("");
    setAnkyResponseReady(false);
    setTimeSinceLastKeystroke(0);
    setWritingSession(null);
    lastKeystrokeTime.current = null;
    sessionStartTime.current = null;
    timeoutRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, []);

  const renderContent = () => {
    if (preparingWritingSession) {
      return (
        <TouchableWithoutFeedback onPress={handleScreenTap}>
          <View className="flex-1 items-center justify-center px-10 pb-[100px] android:pb-20">
            <Animated.Text className="text-white text-3xl font-righteous text-center">
              {ankyPromptStreaming.split("").map((letter, index) => (
                <Animated.Text key={index} className="text-white">
                  {letter}
                </Animated.Text>
              ))}
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
            {isWritingSessionModalOpen && (
              <WritingGameModal
                isVisible={isWritingSessionModalOpen}
                session_long_string={sessionLongString}
                onClose={() => setIsWritingSessionModalOpen(false)}
              />
            )}
          </KeyboardAvoidingView>
        );

      case "completed":
        console.log("****************************************************");
        console.log("****************************************************");
        console.log("inside the completed", sessionLongString);
        console.log("****************************************************");
        console.log("****************************************************");
        let sessionData;
        if (sessionLongString.length > 2) {
          sessionData = extractSessionDataFromLongString(sessionLongString);
        }
        console.log("HERE, the session data is:", sessionData);
        return (
          <SessionEndScreen
            session_id={writingSessionId}
            sessionData={sessionData}
            writingString={sessionLongString}
            onNextStep={async () => {
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
                router.push("/(tabs)/anky");
              } else {
                resetAllWritingGameState();
                setPreparingWritingSession(true);
                setWritingSession(null);
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
