import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  TextInput,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Pressable,
} from "react-native";
import { useAnky } from "@/src/context/AnkyContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePrivy } from "@privy-io/expo";
import WritingGameSessionEnded from "./WritingGameSessionEnded";
import { AnkyverseDay } from "@/src/app/lib/ankyverse";
import { v4 as uuidv4 } from "uuid";
import { WritingSession } from "@/src/types/Anky";
import { WritingGameProps } from "@/src/types/WritingGame";
import axios from "axios";
import { endWritingSession, startWritingSession } from "@/src/api/game";

const { width, height } = Dimensions.get("window");

interface PlaygroundProps {
  secondsBetweenKeystrokes?: number;
  onGameOver?: (wordsWritten: number, timeSpent: number) => void;
  onClose?: () => void;
  ankyverseDay?: AnkyverseDay;
  initialText?: string;
  writingSession?: WritingSession;
  setWritingSession?: (writingSession: WritingSession) => void;
  propsModes?: WritingGameProps;
}

const WritingGame: React.FC<PlaygroundProps> = React.memo(
  ({
    secondsBetweenKeystrokes = 8,
    onGameOver,
    onClose,
    ankyverseDay,
    initialText = "",
    writingSession,
    propsModes = undefined,
  }) => {
    console.log("WritingGame component rendered");
    const { ankyUser, setIsWritingGameVisible, setIsUserWriting, currentAnky } =
      useAnky();
    const { user, getAccessToken } = usePrivy();

    const lastKeystroke = useRef<number>(Date.now());
    const textInputRef = useRef<TextInput>(null);
    const animatedValue = useRef(new Animated.Value(1)).current;

    const [gameState, setGameState] = useState({
      sessionId: writingSession?.session_id || uuidv4(),
      gameOver: false,
      wordsWritten: writingSession?.words_written || 0,
      timeSpent: writingSession?.time_spent || 0,
      isSessionActive: false,
      cameBackToRead: false,
      sessionStarted: false,
      targetReached: false,
      displaySeconds: true,
      keyboardHeight: 0,
      tapCount: 0,
    });

    const [text, setText] = useState<string>(
      writingSession?.writing || initialText
    );

    // Memoized keyboard event handlers
    useEffect(() => {
      const keyboardDidShow = Keyboard.addListener("keyboardDidShow", (e) => {
        setGameState((prev) => ({
          ...prev,
          keyboardHeight: e.endCoordinates.height,
        }));
      });

      const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
        setGameState((prev) => ({
          ...prev,
          keyboardHeight: 0,
        }));
      });

      return () => {
        keyboardDidShow.remove();
        keyboardDidHide.remove();
      };
    }, []);

    useEffect(() => {
      if (!gameState.sessionStarted || gameState.gameOver) return;

      const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastKeystroke = (now - lastKeystroke.current) / 1000;

        if (timeSinceLastKeystroke >= secondsBetweenKeystrokes) {
          clearInterval(interval);
          setGameState((prev) => ({
            ...prev,
            gameOver: true,
            isSessionActive: false,
          }));
          const words = text.trim().split(/\s+/).length;
          onGameOver?.(words, Math.floor(gameState.timeSpent));
          sendWritingSessionToBackend();
        } else {
          setGameState((prev) => {
            const newTimeSpent = prev.timeSpent + 0.1;
            return {
              ...prev,
              timeSpent: newTimeSpent,
              targetReached:
                newTimeSpent >= (propsModes?.targetDuration ?? 0)
                  ? true
                  : prev.targetReached,
            };
          });

          if (timeSinceLastKeystroke >= secondsBetweenKeystrokes * 0.88) {
            Vibration.vibrate(50);
          }

          Animated.timing(animatedValue, {
            toValue: 1 - timeSinceLastKeystroke / secondsBetweenKeystrokes,
            duration: 100,
            useNativeDriver: false,
          }).start();
        }
      }, 100);

      return () => clearInterval(interval);
    }, [
      gameState.sessionStarted,
      gameState.gameOver,
      secondsBetweenKeystrokes,
      text,
      onGameOver,
    ]);

    const handleTextChange = useCallback(
      (newText: string) => {
        setText(newText);
        lastKeystroke.current = Date.now();
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }).start();
      },
      [animatedValue]
    );

    const handleCancel = useCallback(() => {
      setIsWritingGameVisible(false);
      setGameState((prev) => ({ ...prev, gameOver: true }));
      onClose?.();
    }, [onClose, setIsWritingGameVisible]);

    const startSession = useCallback(async () => {
      const writingSession: WritingSession = {
        session_id: gameState.sessionId,
        session_index_for_user: null,
        user_id: ankyUser?.id || "anonymous",
        starting_timestamp: new Date(),
        ending_timestamp: null,
        prompt: currentAnky?.anky_inquiry,
        writing: null,
        words_written: 0,
        is_anky: false,
        parent_anky_id: null,
        status: "starting",
      };
      console.log("starting the writing session with ", writingSession);

      setGameState((prev) => ({ ...prev, sessionStarted: true }));
      setIsUserWriting(true);
      lastKeystroke.current = Date.now();
      const accessToken = user ? (await getAccessToken()) || "" : "";
      const res = await startWritingSession(writingSession, accessToken);
      console.log("the res is: ", res);

      if (Platform.OS === "ios" || Platform.OS === "android") {
        Keyboard.dismiss();
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      } else {
        textInputRef.current?.focus();
      }
    }, [setIsUserWriting]);

    const sendWritingSessionToBackend = async () => {
      if (text.length < 10) return;

      const writingSession: WritingSession = {
        session_id: gameState.sessionId,
        session_index_for_user: null,
        user_id: user?.id || "anonymous",
        starting_timestamp: new Date(),
        ending_timestamp: null,
        prompt: currentAnky?.anky_inquiry,
        writing: text,
        words_written: text.split(" ").length,
        newen_earned: 0,
        time_spent: Math.floor(gameState.timeSpent),
        is_anky: gameState.timeSpent >= 480,
        parent_anky_id: null,
        status: gameState.timeSpent >= 480 ? "completed" : "draft",
        anky_id: null,
        anky: null,
      };

      try {
        const sessions = await AsyncStorage.getItem("writingSessions");
        const updatedSessions = sessions
          ? [...JSON.parse(sessions), writingSession]
          : [writingSession];
        await AsyncStorage.setItem(
          "writingSessions",
          JSON.stringify(updatedSessions)
        );
        let accessToken = "";
        if (user) {
          const token = await getAccessToken();
          accessToken = token || "";
        }

        const res = await endWritingSession(writingSession, accessToken);
        console.log("The res from endind the writing session is", res);
      } catch (error) {
        console.error("Error handling writing session:", error);
      }
    };

    const onRetry = useCallback(() => {
      setGameState((prevState) => ({
        ...prevState,
        gameOver: false,
        sessionStarted: false,
        wordsWritten: 0,
        timeSpent: 0,
        targetReached: false,
        text: "",
        tapCount: 0,
        sessionId: uuidv4(),
      }));
      lastKeystroke.current = Date.now();
      animatedValue.setValue(1);
      // startSession();
    }, []);

    if (!gameState.cameBackToRead && gameState.gameOver) {
      console.log("Rendering WritingGameSessionEnded component");
      return (
        <View style={{ flex: 1 }}>
          <View className="absolute w-full h-full">
            <TextInput
              className="flex-1 text-2xl p-5"
              style={{
                color: ankyverseDay?.currentColor.textColor || "white",
                opacity: 0.3,
              }}
              multiline
              editable={false}
              value={text}
            />
          </View>
          <WritingGameSessionEnded
            setCameBackToRead={(value) =>
              setGameState((prev) => ({ ...prev, cameBackToRead: value }))
            }
            sessionId={gameState.sessionId}
            targetDuration={propsModes?.targetDuration || 480}
            sessionDuration={gameState.timeSpent}
            wordsWritten={gameState.wordsWritten}
            targetReached={gameState.targetReached}
            totalTaps={gameState.tapCount}
            onClose={handleCancel}
            onRetry={() => {
              setGameState({
                ...gameState,
                gameOver: false,
                sessionStarted: false,
                wordsWritten: 0,
                timeSpent: 0,
                targetReached: false,
                tapCount: 0,
              });
              setText("");
              lastKeystroke.current = Date.now();
              animatedValue.setValue(1);
            }}
            setGameOver={(value) =>
              setGameState((prev) => ({ ...prev, gameOver: value }))
            }
          />
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        className="relative"
      >
        <View
          className="flex-1 w-full pt-16"
          style={{
            backgroundColor: ankyverseDay?.currentColor.main || "#000",
          }}
        >
          {gameState.displaySeconds && (
            <Pressable
              onPress={() =>
                setGameState((prev) => ({
                  ...prev,
                  displaySeconds: !prev.displaySeconds,
                }))
              }
              className="absolute top-8 right-4"
            >
              <Text style={{ color: "black" }}>
                {Math.floor(gameState.timeSpent)}
              </Text>
            </Pressable>
          )}
          <View
            style={{
              position: "absolute",
              top: 20,
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <Text className="absolute top-4 left-4">
              target: {propsModes?.targetDuration || 480} |{" "}
              {secondsBetweenKeystrokes}
            </Text>
          </View>

          <Animated.View
            className="h-3 border-b border-t border-black"
            style={{
              width: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
              backgroundColor: animatedValue.interpolate({
                inputRange: [0, 0.143, 0.286, 0.429, 0.571, 0.714, 0.857, 1],
                outputRange: [
                  "#ff0000", // Red
                  "#ffa500", // Orange
                  "#ffff00", // Yellow
                  "#00ff00", // Green
                  "#0000ff", // Blue
                  "#4b0082", // Indigo
                  "#8b00ff", // Violet
                  "#ffffff", // White
                ],
              }),
            }}
          />
          {gameState.targetReached && (
            <View className="absolute top-20 left-0 right-0 items-center z-10">
              <Text className="text-white text-2xl font-bold bg-black/50 px-6 py-3 rounded-lg">
                Your anky is ready.
              </Text>
            </View>
          )}
          {writingSession ? (
            <TextInput
              className="flex-1 text-2xl p-5"
              style={{
                color: ankyverseDay?.currentColor.textColor,
                maxHeight: height - gameState.keyboardHeight - 100,
              }}
              multiline
              value={writingSession.writing || ""}
              editable={false}
            />
          ) : (
            <TextInput
              ref={textInputRef}
              className="flex-1 text-2xl px-2"
              style={{
                color: ankyverseDay?.currentColor.textColor || "#fff",
                maxHeight: height - gameState.keyboardHeight - 100,
              }}
              multiline
              onChangeText={handleTextChange}
              value={text}
              placeholder={currentAnky?.anky_inquiry}
              placeholderTextColor={
                ankyverseDay?.currentColor.textColor || "#fff"
              }
              editable={gameState.sessionStarted}
            />
          )}
          {!gameState.sessionStarted && !writingSession && (
            <TouchableWithoutFeedback onPress={startSession}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(0,0,0,0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              />
            </TouchableWithoutFeedback>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }
);

export default WritingGame;
