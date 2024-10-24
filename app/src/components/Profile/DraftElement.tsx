import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface DraftElementProps {
  preview: string;
  wordCount: number;
  createdAt: string;
  onPress: () => void;
}

const DraftElement: React.FC<DraftElementProps> = ({
  preview,
  wordCount,
  createdAt,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: "white",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
      }}
      onPress={onPress}
    >
      <Text style={{ color: "#666", marginBottom: 8 }}>{preview}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, color: "#888" }}>{wordCount} words</Text>
        <Text style={{ fontSize: 12, color: "#888" }}>{createdAt}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default DraftElement;
