import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
} from "react-native";

import Anky0 from "../../assets/ankys/0.png";
import Anky1 from "../../assets/ankys/1.png";
import Anky2 from "../../assets/ankys/2.png";
import Anky3 from "../../assets/ankys/3.png";
import Anky4 from "../../assets/ankys/4.png";
import Anky5 from "../../assets/ankys/5.png";
import Anky6 from "../../assets/ankys/6.png";
import Anky7 from "../../assets/ankys/7.png";
import Anky8 from "../../assets/ankys/8.png";
import Anky9 from "../../assets/ankys/9.png";
import Anky10 from "../../assets/ankys/10.png";
import Anky11 from "../../assets/ankys/11.png";

const BACKGROUND_IMAGE = require("@/assets/images/bg.png");

const ANKY_IMAGES = [
  Anky0,
  Anky1,
  Anky2,
  Anky3,
  Anky4,
  Anky5,
  Anky6,
  Anky7,
  Anky8,
  Anky9,
  Anky10,
  Anky11,
];

export default function HomeScreen() {
  const [selectedAnky, setSelectedAnky] = useState<number | null>(null);
  const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAnkyPress = (ankyId: number) => {
    setSelectedAnky(ankyId);
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseModal = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start(() => {
      setSelectedAnky(null);
    });
  };

  const renderAnkyGrid = () => {
    const itemsPerRow = 3;
    const rows = [];
    for (let i = 0; i < ANKY_IMAGES.length; i += itemsPerRow) {
      const rowItems = ANKY_IMAGES.slice(i, i + itemsPerRow);
      rows.push(
        <View key={i} className="flex-row justify-between mb-2">
          {rowItems.map((image, index) => (
            <TouchableOpacity
              key={i + index}
              className="flex-1 mx-1"
              onPress={() => handleAnkyPress(i + index)}
            >
              <Image
                source={image}
                style={{
                  width: "100%",
                  aspectRatio: 1,
                  borderRadius: 12,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    return rows;
  };

  return (
    <View className="flex-1">
      <Image
        source={BACKGROUND_IMAGE}
        style={{
          position: "absolute",
          width: screenWidth,
          height: screenHeight,
          opacity: 0.7,
        }}
        resizeMode="cover"
      />

      <ScrollView className="flex-1 p-4">{renderAnkyGrid()}</ScrollView>

      <Modal
        visible={selectedAnky !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center p-4"
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <Animated.View
            className="bg-white rounded-xl p-4 w-[90%]"
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            {selectedAnky !== null && (
              <Image
                source={ANKY_IMAGES[selectedAnky]}
                style={{
                  width: "100%",
                  height: screenWidth * 0.8,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
