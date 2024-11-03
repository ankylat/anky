import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { Svg, Path, Circle, G } from "react-native-svg";
import Sound from "react-native-sound";

interface Level {
  id: number;
  unlocked: boolean;
  stars: number;
  completed: boolean;
  animate: boolean;
}

interface Particle {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

interface AnimatedPathProps {
  animation: Animated.Value;
  width: number;
  height: number;
}

interface LevelMarkerProps {
  level: Level;
  onPress: () => void;
  animate: boolean;
}

interface StarRatingProps {
  stars: number;
}

interface DecorativeElementsProps {
  floating: Animated.Value;
}

interface ProgressIndicatorProps {
  total: number;
  completed: number;
}

const { width, height } = Dimensions.get("window");

// Preload sounds
Sound.setCategory("Playback");
const buttonSound = new Sound("button_click.mp3", Sound.MAIN_BUNDLE);
const starSound = new Sound("star_earned.mp3", Sound.MAIN_BUNDLE);
const completionSound = new Sound("level_complete.mp3", Sound.MAIN_BUNDLE);

const GameMap: React.FC = () => {
  // State management
  const [levels, setLevels] = useState<Level[]>(
    Array(96)
      .fill(null)
      .map((_, index) => ({
        id: index + 1,
        unlocked: index < 5,
        stars: Math.floor(Math.random() * 4),
        completed: index < 3,
        animate: false,
      }))
  );

  // Animation values
  const pathAnimation = useRef(new Animated.Value(0)).current;
  const levelAnimations = useRef(
    levels.map(() => new Animated.Value(0))
  ).current;
  const floatingAnimation = useRef(new Animated.Value(0)).current;

  // Background particle system
  const particles = useRef<Particle[]>(
    Array(40)
      .fill(null)
      .map(() => ({
        x: Math.random() * width,
        y: Math.random() * (height * 3), // Extend particles for scrollable area
        scale: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 2 + 1,
      }))
  ).current;

  useEffect(() => {
    // Animate path drawing on mount
    Animated.timing(pathAnimation, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    // Stagger animate level markers
    Animated.stagger(
      50,
      levelAnimations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      )
    ).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnimation, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLevelPress = (levelId: number): void => {
    buttonSound.play();

    // Find level and check if it's unlocked
    const level = levels.find((l) => l.id === levelId);
    if (!level?.unlocked) {
      Alert.alert("Level Locked", "Complete previous levels to unlock!");
      return;
    }

    // Trigger level marker animation
    setLevels((prev) =>
      prev.map((l) => (l.id === levelId ? { ...l, animate: true } : l))
    );

    // Simulate level completion after 2 seconds
    setTimeout(() => {
      completionSound.play();
      setLevels((prev) =>
        prev.map((l) => {
          if (l.id === levelId) {
            const newStars = Math.min(3, (l.stars || 0) + 1);
            if (newStars > (l.stars || 0)) starSound.play();
            return {
              ...l,
              completed: true,
              stars: newStars,
              animate: false,
            };
          }
          // Unlock next level
          if (l.id === levelId + 1) {
            return { ...l, unlocked: true };
          }
          return l;
        })
      );
    }, 2000);
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      scrollEventThrottle={16}
    >
      <View style={[styles.container, { height: height * 3 }]}>
        {/* Animated background particles */}
        {particles.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                transform: [
                  {
                    translateY: floatingAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, particle.speed * 10],
                    }),
                  },
                  { scale: particle.scale },
                ],
              },
            ]}
          />
        ))}

        {/* Background path */}
        <Svg height={height * 3} width={width} style={StyleSheet.absoluteFill}>
          <AnimatedPath
            animation={pathAnimation}
            width={width}
            height={height * 3}
          />
        </Svg>

        {/* Decorative elements */}
        <DecorativeElements floating={floatingAnimation} />

        {/* Level markers */}
        {levels.map((level, index) => (
          <Animated.View
            key={level.id}
            style={[
              styles.levelMarkerContainer,
              {
                transform: [
                  {
                    scale: levelAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                  {
                    translateY: floatingAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5],
                    }),
                  },
                ],
                ...getLevelPosition(index, height * 3),
              },
            ]}
          >
            <LevelMarker
              level={level}
              onPress={() => handleLevelPress(level.id)}
              animate={level.animate}
            />
          </Animated.View>
        ))}

        {/* Progress indicator */}
        <ProgressIndicator
          total={levels.length}
          completed={levels.filter((l) => l.completed).length}
        />
      </View>
    </ScrollView>
  );
};

const AnimatedPath: React.FC<AnimatedPathProps> = ({
  animation,
  width,
  height,
}) => {
  // Calculate path length
  const pathLength = 3000; // Increased path length for scrollable area

  return (
    <G opacity={animation.toString()}>
      {/* Glow effect */}
      <Path
        d={getPathData(width, height)}
        stroke="#F6E05E"
        strokeWidth={44}
        strokeOpacity={0.3}
        fill="none"
      />
      {/* Main path */}
      <Path
        d={getPathData(width, height)}
        stroke="#F6E05E"
        strokeWidth={40}
        fill="none"
        strokeDasharray={[pathLength]}
        strokeDashoffset={animation
          .interpolate({
            inputRange: [0, 1],
            outputRange: [pathLength, 0],
          })
          .toString()}
      />
    </G>
  );
};

const LevelMarker: React.FC<LevelMarkerProps> = ({
  level,
  onPress,
  animate,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animate) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [animate]);

  return (
    <TouchableOpacity onPress={onPress} disabled={!level.unlocked}>
      <Animated.View
        style={[
          styles.levelMarker,
          level.unlocked ? styles.levelUnlocked : styles.levelLocked,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.levelText}>{level.id}</Text>
        {level.unlocked && <StarRating stars={level.stars} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const StarRating: React.FC<StarRatingProps> = ({ stars }) => (
  <View style={styles.starsContainer}>
    {[...Array(3)].map((_, i) => (
      <Animated.Text
        key={i}
        style={[styles.star, i < stars ? styles.starFilled : styles.starEmpty]}
      >
        ★
      </Animated.Text>
    ))}
  </View>
);

const DecorativeElements: React.FC<DecorativeElementsProps> = ({
  floating,
}) => (
  <>
    {/* Trees */}
    {[...Array(20)].map((_, i) => (
      <Animated.View
        key={i}
        style={[
          styles.tree,
          {
            left: Math.random() * width,
            top: Math.random() * (height * 3),
            transform: [
              {
                translateY: floating.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -3],
                }),
              },
            ],
          },
        ]}
      />
    ))}

    {/* Clouds */}
    {[...Array(10)].map((_, i) => (
      <Animated.View
        key={i}
        style={[
          styles.cloud,
          {
            left: Math.random() * width,
            top: Math.random() * (height * 3),
            transform: [
              {
                translateX: floating.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 10 + Math.random() * 10],
                }),
              },
            ],
          },
        ]}
      />
    ))}
  </>
);

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  total,
  completed,
}) => (
  <View style={styles.progressContainer}>
    <Text style={styles.progressText}>
      Progress: {completed}/{total}
    </Text>
    <View style={styles.progressBar}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: `${(completed / total) * 100}%`,
          },
        ]}
      />
    </View>
  </View>
);

// Styles
const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    backgroundColor: "#E8F5E9",
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    opacity: 0.5,
  },
  levelMarkerContainer: {
    position: "absolute",
    width: 50,
    height: 50,
  },
  levelMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelUnlocked: {
    backgroundColor: "#D97706",
  },
  levelLocked: {
    backgroundColor: "#9CA3AF",
  },
  levelText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  starsContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: -20,
    justifyContent: "center",
  },
  star: {
    fontSize: 16,
    marginHorizontal: 2,
  },
  starFilled: {
    color: "#FBBF24",
  },
  starEmpty: {
    color: "#9CA3AF",
  },
  tree: {
    position: "absolute",
    width: 30,
    height: 40,
    backgroundColor: "#2F855A",
    borderRadius: 15,
  },
  cloud: {
    position: "absolute",
    width: 60,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 15,
  },
  progressContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
  },
  progressText: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  progressBar: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
});

// Helper functions
const getPathData = (width: number, height: number): string => {
  // Create a more complex winding path for 96 levels
  let path = `M ${width * 0.5} ${height * 0.95}`; // Start at bottom

  // Generate a winding path up the screen
  for (let i = 0; i < 32; i++) {
    // 32 segments for 96 levels (3 levels per segment)
    const y = height * (0.95 - (i + 1) * 0.03);
    const xOffset = i % 2 === 0 ? 0.3 : -0.3;
    path += ` Q ${width * (0.5 + xOffset)} ${y + height * 0.015} ${
      width * 0.5
    } ${y}`;
  }

  return path;
};

const getLevelPosition = (
  index: number,
  totalHeight: number
): { left: number; top: number } => {
  // Calculate positions for 96 levels along the winding path
  const segmentHeight = totalHeight / 32; // 32 segments total from getPathData
  const row = Math.floor(index / 3); // 3 levels per segment
  const column = index % 3;

  // Calculate y position based on segment height
  const y = totalHeight * 0.95 - row * segmentHeight; // Start from bottom 95%

  // Calculate x offset that matches the winding path
  const xOffset =
    row % 2 === 0
      ? -width * 0.3 + column * width * 0.3 // Left side segments
      : width * 0.3 - column * width * 0.3; // Right side segments

  return {
    left: width * 0.5 + xOffset - 25, // Center on path with marker offset
    top: y - 25, // Offset for marker height
  };
};

export default GameMap;
