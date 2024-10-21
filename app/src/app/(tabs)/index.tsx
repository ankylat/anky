import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  TouchableOpacity,
  PanResponder,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useUser } from "../../context/UserContext";
import CastElement from "../../components/Cast";

const BACKGROUND_IMAGE = require("@/assets/images/bg.png");

export default function HomeScreen() {
  const { casts, isLoading, error } = useUser();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
  const [showFeed, setShowFeed] = useState(true);
  const [scale, setScale] = useState(new Animated.Value(1));
  const [pan, setPan] = useState(new Animated.ValueXY());

  const [showTabBar, setShowTabBar] = useState(false);

  useEffect(() => {
    setContentHeight(Math.max(screenHeight, casts.length * 200 + 100));
  }, [casts, screenHeight]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (evt.nativeEvent.touches.length === 2) {
        let dx = Math.abs(
          evt.nativeEvent.touches[0].pageX - evt.nativeEvent.touches[1].pageX
        );
        let dy = Math.abs(
          evt.nativeEvent.touches[0].pageY - evt.nativeEvent.touches[1].pageY
        );
        let distance = Math.sqrt(dx * dx + dy * dy);
        setScale(new Animated.Value(distance / 150));
      } else {
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);
      }
    },
    onPanResponderRelease: () => {
      pan.flattenOffset();
    },
  });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 20;
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom
      ) {
        setShowTabBar(true);
      }
    },
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Image
        source={BACKGROUND_IMAGE}
        style={{
          position: "absolute",
          width: screenWidth,
          height: screenHeight,
        }}
        resizeMode="cover"
      />
      <Animated.ScrollView
        className="flex-1"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: handleScroll }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ minHeight: contentHeight }}
      >
        {casts.slice(0, 5).map((cast, index) => (
          <View
            key={index}
            className="bg-white bg-opacity-80 rounded-lg m-4 shadow-md"
          >
            <CastElement cast={cast} />
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
