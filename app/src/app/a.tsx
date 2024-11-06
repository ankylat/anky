import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Keyboard,
  TextInput,
  Image as RNImage,
  ImageBackground,
  Platform,
} from "react-native";
import { router } from "expo-router";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolate,
  withRepeat,
  cancelAnimation,
  SlideInDown,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ColorSchemeKey = keyof typeof COLOR_SCHEMES;

// Color schemes for different swipe directions
const COLOR_SCHEMES = {
  default: {
    background: "#1a1a1a",
    text: "#ffffff",
  },
  up: {
    background: "#2E3192",
    text: "#E6E6E6",
  },
  down: {
    background: "#6B4E71",
    text: "#F5F5F5",
  },
  left: {
    background: "#8B4513",
    text: "#FFDEAD",
  },
  right: {
    background: "#DAA520",
    text: "#FFFFFF",
  },
};

// Quality levels for progressive image loading
const QUALITY_LEVELS = Array.from({ length: 8 }, (_, i) => i + 1);

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function WelcomeScreen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [currentQuality, setCurrentQuality] = useState(1);
  const [isWriting, setIsWriting] = useState(false);

  // Animated values
  const backgroundOpacity = useSharedValue(0.8);
  const textProgress = useSharedValue(0);
  const colorScheme = useSharedValue<ColorSchemeKey>("default");
  const shakeAnimation = useSharedValue(0);
  const timerProgress = useSharedValue(1);
  const textScale = useSharedValue(1);
  const blurIntensity = useSharedValue(0);

  // Refs
  const lastKeystrokeTime = useRef(Date.now());
  const inputRef = useRef<TextInput>(null);
  const writingStartTime = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load background images progressively
  useEffect(() => {
    const loadNextQuality = () => {
      if (currentQuality < 8) {
        const img = RNImage.resolveAssetSource(
          require("../../assets/images/anky.png")
        );
        setCurrentQuality((prev) => prev + 1);
      }
    };

    loadNextQuality();
  }, [currentQuality]);

  // Keyboard listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardOpen(true);
      blurIntensity.value = withTiming(10);
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardOpen(false);
      blurIntensity.value = withTiming(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Writing timer management
  useEffect(() => {
    if (isWriting) {
      writingStartTime.current = Date.now();
      startKeystrokeTimer();
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isWriting]);

  const startKeystrokeTimer = useCallback(() => {
    timerProgress.value = withTiming(
      0,
      {
        duration: 8000,
      },
      (finished) => {
        if (finished) {
          runOnJS(handleWritingTimeout)();
        }
      }
    );
  }, []);

  const handleWritingTimeout = useCallback(() => {
    const writingDuration = (Date.now() - writingStartTime.current) / 1000;

    if (writingDuration < 30) {
      lessThan30Seconds();
    } else if (writingDuration >= 30 && writingDuration <= 180) {
      createAnonUserProfile(userInput);
      displayWrittenText();
    }
  }, [userInput]);

  // Gesture handling
  const panGesture = Gesture.Pan()
    .onStart(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      const { translationX, translationY } = event;
      const magnitude = Math.sqrt(translationX ** 2 + translationY ** 2);

      if (magnitude > 50) {
        if (Math.abs(translationX) > Math.abs(translationY)) {
          colorScheme.value = translationX > 0 ? "right" : "left";
        } else {
          colorScheme.value = translationY > 0 ? "down" : "up";
        }

        shakeAnimation.value = withSequence(
          withTiming(5, { duration: 100 }),
          withTiming(-5, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
      }
    });

  const tapGesture = Gesture.Tap().onStart(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsWriting(true);
    inputRef.current?.focus();
  });

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    const scheme = COLOR_SCHEMES[colorScheme.value];
    return {
      backgroundColor: withSpring(scheme.background),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const scheme = COLOR_SCHEMES[colorScheme.value];
    return {
      color: withSpring(scheme.text),
      transform: [
        { translateX: shakeAnimation.value },
        { scale: textScale.value },
      ],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${interpolate(timerProgress.value, [0, 1], [0, 100])}%`,
    };
  });

  // Helper functions
  const lessThan30Seconds = () => {
    textScale.value = withSequence(
      withTiming(1.2, { duration: 300 }),
      withTiming(0.8, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const createAnonUserProfile = async (text: string) => {
    try {
      // Implementation for profile creation
      // This would typically be an API call
      console.log("Creating profile with text:", text);
      router.push("/(tabs)/profile");
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  };

  const displayWrittenText = useCallback(() => {
    textProgress.value = withTiming(1, {
      duration: 2000,
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.container, containerStyle]}>
        <ImageBackground
          source={require("../../assets/images/anky.png")}
          style={styles.backgroundImage}
        >
          <AnimatedBlurView
            style={[styles.blurContainer]}
            intensity={blurIntensity}
          >
            <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>
              <Animated.View style={styles.contentContainer}>
                <Animated.Text
                  style={[styles.mainText, textStyle]}
                  entering={FadeIn.duration(1000)}
                >
                  tell me who you are
                </Animated.Text>

                {isKeyboardOpen && (
                  <Animated.View
                    style={[styles.progressBar, progressBarStyle]}
                    entering={SlideInDown.duration(500)}
                  />
                )}

                <AnimatedTextInput
                  ref={inputRef}
                  style={[styles.hiddenInput]}
                  multiline
                  value={userInput}
                  onChangeText={setUserInput}
                  onKeyPress={() => {
                    lastKeystrokeTime.current = Date.now();
                    timerProgress.value = 1;
                    startKeystrokeTimer();
                  }}
                />
              </Animated.View>
            </GestureDetector>
          </AnimatedBlurView>
        </ImageBackground>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainText: {
    fontSize: 32,
    fontFamily: "SpaceMono",
    textAlign: "center",
    padding: 20,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: "#4CAF50",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
