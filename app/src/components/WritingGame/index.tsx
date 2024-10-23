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
} from "react-native";
import { useAnky } from "@/src/context/AnkyContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { processWritingSession } from "../../app/lib/writingGame";
import { usePrivy } from "@privy-io/expo";
import WritingGameSessionEnded from "./WritingGameSessionEnded";
import { AnkyverseDay } from "@/src/app/lib/ankyverse";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const { width, height } = Dimensions.get("window");

interface ModeConfig {
  prompt: string;
  color: string;
  component?: React.ComponentType<any>;
}

interface PlaygroundProps {
  modes?: {
    up: ModeConfig;
    right: ModeConfig;
    down: ModeConfig;
    left: ModeConfig;
  };
  sessionSeconds?: number;
  sessionTargetSeconds?: number;
  onGameOver?: (wordsWritten: number, timeSpent: number) => void;
  onClose?: () => void;
  ankyverseDay?: AnkyverseDay;
}

interface Writing {
  text: string;
  timestamp: string;
}

const defaultModes = {
  up: { prompt: "Tell us who you are", color: "#000000", component: null },
  right: {
    prompt: "What's your biggest dream?",
    color: "#1a237e",
    component: null,
  },
  down: {
    prompt: "Describe your perfect day",
    color: "#004d40",
    component: null,
  },
  left: {
    prompt: "What's your greatest fear?",
    color: "#b71c1c",
    component: null,
  },
};

const WritingGame: React.FC<PlaygroundProps> = React.memo(
  ({
    modes = defaultModes,
    sessionSeconds = 8,
    sessionTargetSeconds = 480,
    onGameOver,
    onClose,
    ankyverseDay,
  }) => {
    console.log("WritingGame component rendered");
    const { user, isReady, getAccessToken } = usePrivy();
    console.log("IN here the user is: ", user);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [wordsWritten, setWordsWritten] = useState<number>(0);
    const [timeSpent, setTimeSpent] = useState<number>(0);
    const [sessionStarted, setSessionStarted] = useState<boolean>(false);
    const [targetReached, setTargetReached] = useState<boolean>(false);
    const lastKeystroke = useRef<number>(Date.now());
    const animatedValue = useRef(new Animated.Value(1)).current;
    const {
      sendWritingToAnky,
      setIsWriteModalVisible,
      isUserWriting,
      setIsUserWriting,
    } = useAnky();
    const textInputRef = useRef<TextInput>(null);

    const [currentMode, setCurrentMode] = useState<string>("up");
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
    const [text, setText] = useState<string>("");
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
      if (!sessionStarted || gameOver) return;

      console.log("Starting session timer");
      const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastKeystroke = (now - lastKeystroke.current) / 1000;
        console.log("Time since last keystroke:", timeSinceLastKeystroke);

        if (timeSinceLastKeystroke >= sessionSeconds) {
          console.log("Session time exceeded, ending game");
          clearInterval(interval);
          setGameOver(true);

          const words = text.trim().split(/\s+/).length;
          console.log("Words written:", words);
          setWordsWritten(words);

          if (onGameOver) {
            console.log("Calling onGameOver callback");
            onGameOver(words, Math.floor(timeSpent));
          }

          // Send writing session to backend
          sendWritingSessionToBackend();
        } else {
          setTimeSpent((prev) => {
            const newTimeSpent = prev + 0.1;
            console.log("Time spent:", newTimeSpent);
            if (newTimeSpent >= sessionTargetSeconds && !targetReached) {
              console.log("Target reached!");
              setTargetReached(true);
              // You can add more UI feedback here
            }
            return newTimeSpent;
          });
        }

        Animated.timing(animatedValue, {
          toValue: 1 - timeSinceLastKeystroke / sessionSeconds,
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
      sessionSeconds,
      sessionTargetSeconds,
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

    const handleScreenTap = useCallback(() => {
      console.log("inside the screen tap");
      if (sessionStarted) {
        Vibration.vibrate(100);
        setTapCount((prevCount) => {
          const newCount = prevCount + 1;
          if (newCount >= 3) {
            handleCancel();
          }
          return newCount;
        });
      }
    }, [sessionStarted]);

    const handleCancel = useCallback(() => {
      console.log("Cancel button pressed");
      setIsWriteModalVisible(false);
      setGameOver(true);
      if (onClose) {
        onClose();
      }
    }, [onClose, setIsWriteModalVisible]);

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
      if (user) {
        try {
          const accessToken = await getAccessToken();
          const response = await axios.post(
            `${process.env.EXPO_PUBLIC_ANKY_API_URL}/submit-writing-session`,
            {
              sessionId,
              content: text,
              wordsWritten,
              timeSpent,
              userId: user.id,
              fid: user.linked_accounts.find(
                (account) => account.type === "farcaster"
              )?.fid,
              prompt: modes[currentMode as keyof typeof modes].prompt,
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          console.log("Writing session submitted successfully:", response.data);
          // Here you can update the landing feed with the new Anky
          // For example, you could dispatch an action to update your app's state
        } catch (error) {
          console.error("Error submitting writing session:", error);
        }
      } else {
        // Save session locally if user is not logged in
        try {
          const draft = {
            sessionId,
            sessionDuration: timeSpent,
            wordsWritten,
            totalTaps: tapCount,
            initialInquiry: {
              prompt: modes[currentMode as keyof typeof modes].prompt,
              color: modes[currentMode as keyof typeof modes].color,
            },
            content: text,
            date: new Date().toISOString(),
          };
          const drafts = await AsyncStorage.getItem("writingDrafts");
          const updatedDrafts = drafts
            ? [...JSON.parse(drafts), draft]
            : [draft];
          await AsyncStorage.setItem(
            "writingDrafts",
            JSON.stringify(updatedDrafts)
          );
          console.log("Draft saved successfully");
        } catch (error) {
          console.error("Error saving draft:", error);
        }
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
      startSession();
    }, [startSession]);

    console.log("Game over state:", gameOver);

    if (gameOver) {
      console.log("Rendering WritingGameSessionEnded component");
      return (
        <WritingGameSessionEnded
          sessionId={sessionId}
          targetDuration={sessionTargetSeconds}
          sessionDuration={timeSpent}
          wordsWritten={wordsWritten}
          targetReached={targetReached}
          totalTaps={tapCount}
          initialInquiry={{
            prompt: modes[currentMode as keyof typeof modes].prompt,
            color: modes[currentMode as keyof typeof modes].color,
          }}
          onClose={handleCancel}
          onRetry={onRetry}
        />
      );
    }

    const CurrentModeComponent =
      modes[currentMode as keyof typeof modes]?.component;

    console.log("Rendering main WritingGame component");
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          className="flex-1 w-full"
          style={{
            backgroundColor: modes[currentMode as keyof typeof modes].color,
          }}
          {...panResponder.panHandlers}
        >
          <Animated.View
            className="h-14 bg-green-500"
            style={{
              width: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
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
          <TextInput
            ref={textInputRef}
            className="flex-1 text-2xl p-5"
            style={{
              color: ankyverseDay?.currentColor.textColor || "white",
              maxHeight: height - keyboardHeight - 100,
            }}
            multiline
            onChangeText={handleTextChange}
            value={text}
            placeholder={modes[currentMode as keyof typeof modes].prompt}
            placeholderTextColor={`${
              ankyverseDay?.currentColor.textColor || "white"
            }`}
            editable={sessionStarted}
          />
          {!sessionStarted && (
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
