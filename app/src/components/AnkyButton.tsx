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
      style={{
        position: "absolute",
        bottom: 34,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <TouchableOpacity
        className=" rounded-full  items-center justify-center "
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text className="text-white text-7xl">👽</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AnkyButton;
