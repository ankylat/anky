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
  PanResponder,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Pressable,
} from "react-native";
import { useAnky } from "@/src/context/AnkyContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { processWritingSession } from "../../app/lib/writingGame";
import { usePrivy } from "@privy-io/expo";
import WritingGameSessionEnded from "./WritingGameSessionEnded";
import { AnkyverseDay } from "@/src/app/lib/ankyverse";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { WritingSession } from "@/src/types/Anky";
import TopNavBar from "./TopNavBar";
import { useLocalSearchParams } from "expo-router";
import { WritingGameProps } from "@/src/types/WritingGame";

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
    setWritingSession,
    propsModes = {
      targetDuration: 480,
      directions: {
        center: {
          direction: "center",
          prompt: "tell us who you are",
          color: "#000000",
          textColor: "#FFFFFF",
        },
        up: {
          direction: "up",
          prompt: "tell us who you are",
          color: "#9C27B0",
          textColor: "#FFFFFF",
        },
        left: {
          direction: "left",
          prompt: "tell us who you are",
          color: "#2196F3",
          textColor: "#FFFFFF",
        },
        down: {
          direction: "down",
          prompt: "tell us who you are",
          color: "#4CAF50",
          textColor: "#FFFFFF",
        },
        right: {
          direction: "right",
          prompt: "tell us who you are",
          color: "#FF9800",
          textColor: "#000000",
        },
      },
    },
  }) => {
    console.log("WritingGame component rendered");
    const {
      sendWritingToAnky,
      setIsWritingGameVisible,
      isUserWriting,
      setIsUserWriting,
      writingGameProps,
      setWritingGameProps,
    } = useAnky();
    console.log("the writing game props are: ", writingGameProps);
    const { user, isReady, getAccessToken } = usePrivy();
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [wordsWritten, setWordsWritten] = useState<number>(
      writingSession?.words_written || 0
    );
    const [timeSpent, setTimeSpent] = useState<number>(
      writingSession?.time_spent || 0
    );
    const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
    const [cameBackToRead, setCameBackToRead] = useState<boolean>(false);
    const [sessionStarted, setSessionStarted] = useState<boolean>(false);
    const [text, setText] = useState<string>(
      writingSession?.content || initialText
    );
    const [targetReached, setTargetReached] = useState<boolean>(false);
    const [displaySeconds, setDisplaySeconds] = useState<boolean>(true);
    const lastKeystroke = useRef<number>(Date.now());

    const animatedValue = useRef(new Animated.Value(1)).current;

    const textInputRef = useRef<TextInput>(null);

    const [currentMode, setCurrentMode] = useState<string>("center");

    const modes = propsModes || writingGameProps;

    const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
    const [tapCount, setTapCount] = useState<number>(0);
    const [sessionId, setSessionId] = useState<string>("");

    const swipeThreshold = 50;

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderMove: (_, gestureState) => {
            const { dx, dy } = gestureState;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
              if (dx > 0) {
                setCurrentMode("right");
              } else {
                setCurrentMode("left");
              }
            } else if (
              Math.abs(dy) > Math.abs(dx) &&
              Math.abs(dy) > swipeThreshold
            ) {
              if (dy > 0) {
                setCurrentMode("down");
              } else {
                setCurrentMode("up");
              }
            }
          },
          onPanResponderRelease: () => {
            // Reset any state if needed after the swipe
          },
        }),
      []
    );

    useEffect(() => {
      console.log("Setting up keyboard listeners");
      const keyboardDidShowListener = Keyboard.addListener(
        "keyboardDidShow",
        (e) => {
          console.log("Keyboard shown, height:", e.endCoordinates.height);
          setKeyboardHeight(e.endCoordinates.height);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        "keyboardDidHide",
        () => {
          console.log("Keyboard hidden");
          setKeyboardHeight(0);
        }
      );

      return () => {
        console.log("Cleaning up keyboard listeners");
        keyboardDidHideListener.remove();
        keyboardDidShowListener.remove();
      };
    }, []);

    useEffect(() => {
      console.log("Session started:", sessionStarted);
      setIsSessionActive(sessionStarted);
      if (!sessionStarted || gameOver) return;

      console.log("Starting session timer");
      const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastKeystroke = (now - lastKeystroke.current) / 1000;
        console.log("Time since last keystroke:", timeSinceLastKeystroke);

        if (timeSinceLastKeystroke >= secondsBetweenKeystrokes) {
          clearInterval(interval);
          setGameOver(true);

          const words = text.trim().split(/\s+/).length;
          console.log("Words written:", words);
          setWordsWritten(words);
          setIsSessionActive(false);

          if (onGameOver) {
            console.log("Calling onGameOver callback");
            onGameOver(words, Math.floor(timeSpent));
          }

          // Send writing session to backend
          console.log("sending the writing session to the backend");
          sendWritingSessionToBackend();
        } else {
          setTimeSpent((prev) => {
            const newTimeSpent = prev + 0.1;
            console.log("Time spent:", newTimeSpent);
            if (newTimeSpent >= propsModes.targetDuration && !targetReached) {
              console.log("Target reached!");
              setTargetReached(true);
              // You can add more UI feedback here
            }
            return newTimeSpent;
          });

          // Vibrate at last 30% of life
          if (timeSinceLastKeystroke >= secondsBetweenKeystrokes * 0.88) {
            console.log("Vibrating at last 30% of life");
            Vibration.vibrate(50);
          }
        }

        Animated.timing(animatedValue, {
          toValue: 1 - timeSinceLastKeystroke / secondsBetweenKeystrokes,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }, 100);

      return () => {
        console.log("Cleaning up session timer");
        clearInterval(interval);
      };
    }, [
      sessionStarted,
      secondsBetweenKeystrokes,
      propsModes.targetDuration,
      onGameOver,
      text,
      timeSpent,
      gameOver,
    ]);

    const handleTextChange = useCallback(
      (newText: string): void => {
        console.log("Text changed, length:", newText.length);
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
      console.log("Cancel button pressed");
      setIsWritingGameVisible(false);
      setGameOver(true);
      if (onClose) {
        onClose();
      }
    }, [onClose, setIsWritingGameVisible]);

    const startSession = useCallback(() => {
      console.log("Starting writing session");
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      setSessionStarted(true);
      setIsUserWriting(true);
      lastKeystroke.current = Date.now();
      textInputRef.current?.focus();
      if (Platform.OS === "ios" || Platform.OS === "android") {
        Keyboard.dismiss();
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
      }
    }, [setIsUserWriting]);

    const sendWritingSessionToBackend = async () => {
      console.log("==========THE TEXT HERE IS==========", text);
      if (text.length < 10) return;
      const isAnky = timeSpent >= 480;
      const writingSession: WritingSession = {
        session_id: sessionId,
        user_id: user ? user.id : "anonymous",
        content: text,
        words_written: text.split(" ").length,
        time_spent: Math.floor(timeSpent),
        timestamp: new Date(),
        is_anky: isAnky,
        newen_earned: 0, // This should be calculated based on your logic
        daily_session_number: 0, // This should be determined based on user's sessions for the day
        prompt:
          modes.directions[currentMode as keyof typeof modes.directions].prompt,
        fid:
          user?.linked_accounts.find((account) => account.type === "farcaster")
            ?.fid || 18350,
        parent_anky_id: "", // This should be set if it's a response to another Anky
        anky_response: "", // This should be set if it's a response from an Anky
        image_prompt: "",
        self_inquiry_question:
          modes.directions[currentMode as keyof typeof modes.directions].prompt,

        token_id: "",
        contract_address: "",
        image_ipfs_hash: "",
        image_url: "",
        cast_hash: "",
        status: timeSpent >= 480 ? "completed" : "draft",
        ai_processed_at: null,
        nft_minted_at: null,
        blockchain_synced_at: null,
        last_updated_at: new Date(),
      };

      // Save session locally
      try {
        const sessions = await AsyncStorage.getItem("writingSessions");
        const updatedSessions = sessions
          ? [...JSON.parse(sessions), writingSession]
          : [writingSession];
        await AsyncStorage.setItem(
          "writingSessions",
          JSON.stringify(updatedSessions)
        );
        console.log("Writing session saved locally");
      } catch (error) {
        console.error("Error saving writing session locally:", error);
      }

      // If user is logged in and session is long enough, send to backend
      try {
        const accessToken = await getAccessToken();
        const response = await axios.post(
          `${process.env.EXPO_PUBLIC_ANKY_API_URL}/submit-writing-session`,
          writingSession,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log("Anky submitted successfully:", response.data);
        // Here you can update the landing feed with the new Anky
        // For example, you could dispatch an action to update your app's state
      } catch (error) {
        console.error("Error submitting Anky:", error);
      }
    };

    const onRetry = useCallback(() => {
      setGameOver(false);
      setSessionStarted(false);
      setWordsWritten(0);
      setTimeSpent(0);
      setTargetReached(false);
      setText("");
      setTapCount(0);
      setSessionId(uuidv4());
      lastKeystroke.current = Date.now();
      animatedValue.setValue(1);
      // startSession();
    }, [startSession]);

    console.log("Game over state:", gameOver);

    if (!cameBackToRead && gameOver) {
      console.log("Rendering WritingGameSessionEnded component");
      return (
        <View style={{ flex: 1 }}>
          <View
            className="absolute w-full h-full"
            style={{
              backgroundColor:
                modes.directions[currentMode as keyof typeof modes.directions]
                  .color,
            }}
          >
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
            setCameBackToRead={setCameBackToRead}
            sessionId={sessionId}
            targetDuration={propsModes.targetDuration}
            sessionDuration={timeSpent}
            wordsWritten={wordsWritten}
            targetReached={targetReached}
            totalTaps={tapCount}
            onClose={handleCancel}
            onRetry={onRetry}
            setGameOver={setGameOver}
          />
        </View>
      );
    }

    console.log("Rendering main WritingGame component");
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        className="relative"
      >
        <View
          className="flex-1 w-full pt-16"
          style={{
            backgroundColor:
              modes.directions[currentMode as keyof typeof modes.directions]
                .color,
          }}
          {...panResponder.panHandlers}
        >
          {displaySeconds && (
            <View
              style={{
                position: "absolute",
                top: 20,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 1,
              }}
            >
              <Pressable
                onPress={() => setDisplaySeconds((x) => !x)}
                className="absolute top-4 right-4"
              >
                <Text style={{ color: "black" }}>{Math.floor(timeSpent)}</Text>
              </Pressable>
            </View>
          )}

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
          {targetReached && (
            <View
              style={{
                position: "absolute",
                top: 20,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 1,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 24,
                  fontWeight: "bold",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  padding: 10,
                  borderRadius: 5,
                }}
              >
                Your anky is ready.
              </Text>
            </View>
          )}
          {writingSession ? (
            <TextInput
              className="flex-1 text-2xl p-5"
              style={{
                color: ankyverseDay?.currentColor.textColor,
                maxHeight: height - keyboardHeight - 100,
              }}
              multiline
              value={writingSession.content}
              editable={false}
            />
          ) : (
            <TextInput
              ref={textInputRef}
              className="flex-1 text-2xl p-5"
              style={{
                color:
                  modes.directions[currentMode as keyof typeof modes.directions]
                    .textColor,
                maxHeight: height - keyboardHeight - 100,
              }}
              multiline
              onChangeText={handleTextChange}
              defaultValue=""
              placeholder={
                modes.directions[currentMode as keyof typeof modes.directions]
                  .prompt
              }
              placeholderTextColor={
                modes.directions[currentMode as keyof typeof modes.directions]
                  .textColor
              }
              editable={sessionStarted}
            />
          )}
          {!sessionStarted && !writingSession && (
            <TouchableWithoutFeedback onPress={startSession}>
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: "rgba(0,0,0,0.1)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              ></View>
            </TouchableWithoutFeedback>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }
);

export default React.memo(WritingGame);
