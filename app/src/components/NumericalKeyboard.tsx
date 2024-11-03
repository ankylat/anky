import React, { useEffect, useRef } from "react";
import {
  View,
  Dimensions,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Svg, {
  Circle,
  Text,
  LinearGradient,
  Stop,
  Defs,
  RadialGradient,
} from "react-native-svg";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");
const GRID_SIZE = width * 0.9;
const CELL_SIZE = GRID_SIZE / 3;
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const PsychedelicNumbers = ({
  onPress,
}: {
  onPress: (value: string) => void;
}) => {
  // Animation values
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  // Convert animation value to rotation degrees
  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Color interpolation for gradient animation
  const gradientColors = colorAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ["#ff0000", "#00ff00", "#0000ff", "#ff0000"],
  });

  // Setup animations
  useEffect(() => {
    const rotationAnimation = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    );

    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const colorAnimation = Animated.loop(
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    );

    // Start all animations
    rotationAnimation.start();
    scaleAnimation.start();
    colorAnimation.start();

    return () => {
      rotationAnimation.stop();
      scaleAnimation.stop();
      colorAnimation.stop();
    };
  }, []);

  // Individual number cell component
  const NumberCell = ({ number, index }) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isLast = index === NUMBERS.length - 1;

    return (
      <Animated.View
        style={[
          styles.cell,
          {
            transform: [{ scale: scaleAnim }],
            left: isLast ? GRID_SIZE / 3 : col * CELL_SIZE,
            top: row * CELL_SIZE,
          },
        ]}
      >
        <TouchableOpacity>
          <Svg height={CELL_SIZE} width={CELL_SIZE}>
            <Defs>
              <LinearGradient id={`grad${number}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#ff00ff" />
                <Stop offset="1" stopColor="#00ffff" />
              </LinearGradient>
              <RadialGradient
                id={`glow${number}`}
                cx="50%"
                cy="50%"
                rx="50%"
                ry="50%"
              >
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Background glow */}
            <Circle
              cx={CELL_SIZE / 2}
              cy={CELL_SIZE / 2}
              r={CELL_SIZE / 2.5}
              fill={`url(#glow${number})`}
            />

            {/* Number */}
            <Text
              x={CELL_SIZE / 2}
              y={CELL_SIZE / 2}
              fontSize={CELL_SIZE / 2}
              fontWeight="bold"
              fill={`url(#grad${number})`}
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {number}
            </Text>
          </Svg>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background rotating circles */}
      <Animated.View
        style={[styles.backgroundCircles, { transform: [{ rotate: spin }] }]}
      >
        <Svg height={GRID_SIZE} width={GRID_SIZE}>
          <Circle
            cx={GRID_SIZE / 2}
            cy={GRID_SIZE / 2}
            r={GRID_SIZE / 2.2}
            stroke="#ffffff"
            strokeWidth="1"
            fill="none"
            opacity="0.2"
          />
          <Circle
            cx={GRID_SIZE / 2}
            cy={GRID_SIZE / 2}
            r={GRID_SIZE / 2.5}
            stroke="#ffffff"
            strokeWidth="1"
            fill="none"
            opacity="0.2"
          />
        </Svg>
      </Animated.View>

      {/* Number grid */}
      <View style={styles.grid}>
        {NUMBERS.map((number, index) => (
          <NumberCell key={number} number={number} index={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    width: GRID_SIZE,
    height: GRID_SIZE + CELL_SIZE,
    position: "relative",
  },
  cell: {
    position: "absolute",
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundCircles: {
    position: "absolute",
    width: GRID_SIZE,
    height: GRID_SIZE,
  },
});

export default PsychedelicNumbers;
