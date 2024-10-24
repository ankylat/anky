import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type PlaygroundMode = "chat" | "image" | "voice" | "code";

interface AnkyPlaygroundPickerProps {
  mode: PlaygroundMode;
  setMode: (mode: PlaygroundMode) => void;
}

const AnkyPlaygroundPicker: React.FC<AnkyPlaygroundPickerProps> = ({
  mode,
  setMode,
}) => {
  const modes: { key: PlaygroundMode; icon: string; label: string }[] = [
    { key: "chat", icon: "chatbubble-outline", label: "Chat" },
    { key: "image", icon: "image-outline", label: "Image" },
    { key: "voice", icon: "mic-outline", label: "Voice" },
    { key: "code", icon: "code-slash-outline", label: "Code" },
  ];

  return (
    <View style={styles.container}>
      {modes.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.modeButton, mode === item.key && styles.activeMode]}
          onPress={() => setMode(item.key)}
        >
          <Ionicons
            name={item.icon as any}
            size={24}
            color={mode === item.key ? "#FFFFFF" : "#000000"}
          />
          <Text
            style={[
              styles.modeText,
              mode === item.key && styles.activeModeText,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#F0F0F0",
  },
  modeButton: {
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  activeMode: {
    backgroundColor: "#007AFF",
  },
  modeText: {
    marginTop: 5,
    fontSize: 12,
  },
  activeModeText: {
    color: "#FFFFFF",
  },
});

export default AnkyPlaygroundPicker;
