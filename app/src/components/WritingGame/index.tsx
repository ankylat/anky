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
  onGameOver?: (wordsWritten: number, timeSpent: number) => void;
  onClose?: () => void;
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
  ({ modes = defaultModes, sessionSeconds = 8, onGameOver, onClose }) => {
    console.log("WritingGame component rendered");
    const { user } = usePrivy();
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [wordsWritten, setWordsWritten] = useState<number>(0);
    const [timeSpent, setTimeSpent] = useState<number>(0);
    const [sessionStarted, setSessionStarted] = useState<boolean>(false);
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

    const swipeThreshold = 50;

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderMove: () => {},
          onPanResponderRelease: (_, gestureState) => {
            const { dx, dy } = gestureState;
            console.log(`Pan responder released: dx=${dx}, dy=${dy}`);
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
              if (dx > 0) {
                console.log("Swiped right");
                setCurrentMode("right");
              } else {
                console.log("Swiped left");
                setCurrentMode("left");
              }
            } else if (
              Math.abs(dy) > Math.abs(dx) &&
              Math.abs(dy) > swipeThreshold
            ) {
              if (dy > 0 && currentMode !== "down") {
                console.log("Swiped down");
                setCurrentMode("down");
              } else if (dy < 0) {
                console.log("Swiped up");
                setCurrentMode("up");
              }
            }
          },
        }),
      [currentMode]
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
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
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
        } else {
          setTimeSpent((prev) => {
            const newTimeSpent = prev + 0.1;
            console.log("Time spent:", newTimeSpent);
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
    }, [sessionStarted, sessionSeconds, onGameOver, text, timeSpent, gameOver]);

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

    console.log("Game over state:", gameOver);

    if (gameOver) {
      console.log("Rendering WritingGameSessionEnded component");
      return (
        <WritingGameSessionEnded
          sessionDuration={timeSpent}
          wordsWritten={wordsWritten}
          totalTaps={tapCount}
          initialInquiry={{
            prompt: modes[currentMode as keyof typeof modes].prompt,
            color: modes[currentMode as keyof typeof modes].color,
          }}
          onClose={handleCancel}
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
        <TouchableWithoutFeedback onPress={handleScreenTap}>
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
            <TextInput
              ref={textInputRef}
              className="flex-1 text-2xl p-5 text-white"
              multiline
              onChangeText={handleTextChange}
              value={text}
              placeholder={modes[currentMode as keyof typeof modes].prompt}
              placeholderTextColor="#999"
              editable={sessionStarted}
              style={{ maxHeight: height - keyboardHeight - 100 }}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }
);

export default WritingGame;
