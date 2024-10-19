import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAnky } from "@/src/context/AnkyContext";

const AnkyButton: React.FC = () => {
  const { isWriteModalVisible, setIsWriteModalVisible, isUserWriting } =
    useAnky();

  const handlePress = () => {
    setIsWriteModalVisible(!isWriteModalVisible);
  };

  if (isUserWriting) {
    return null;
  }

  return (
    <View
      className="w-18"
      style={{
        position: "absolute",
        bottom: 35,
        left: "50%",
        transform: [{ translateX: -32 }], // Half of the emoji width
        zIndex: 2000,
      }}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Text style={{ fontSize: 60 }}>👽</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AnkyButton;
