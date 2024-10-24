import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { Message, PlaygroundMode } from "@/src/types/AnkyTypes";

interface AnkyInputAreaProps {
  mode: PlaygroundMode;
  onSendMessage: (message: Message) => void;
}

const AnkyInputArea: React.FC<AnkyInputAreaProps> = ({
  mode,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const handleSend = () => {
    if (inputText.trim() !== "") {
      const newMessage: Message = {
        role: "user",
        content: inputText,
        timestamp: Date.now(),
        type: mode === "code" ? "code" : "text",
      };
      onSendMessage(newMessage);
      setInputText("");
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newMessage: Message = {
        role: "user",
        content: result.assets[0].uri,
        timestamp: Date.now(),
        type: "image",
      };
      onSendMessage(newMessage);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (uri) {
      const newMessage: Message = {
        role: "user",
        content: uri,
        timestamp: Date.now(),
        type: "audio",
      };
      onSendMessage(newMessage);
    }
  };

  return (
    <View style={styles.container}>
      {mode === "chat" || mode === "code" ? (
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={mode === "code" ? "Enter code..." : "Type a message..."}
          multiline
        />
      ) : null}
      {mode === "image" && (
        <TouchableOpacity style={styles.iconButton} onPress={handleImagePick}>
          <Ionicons name="image" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
      {mode === "voice" && (
        <TouchableOpacity
          style={[styles.iconButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={24}
            color={isRecording ? "#FF3B30" : "#007AFF"}
          />
        </TouchableOpacity>
      )}
      {(mode === "chat" || mode === "code") && (
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F0F0F0",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  iconButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  recordingButton: {
    backgroundColor: "#FF3B30",
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#007AFF",
  },
});

export default AnkyInputArea;
