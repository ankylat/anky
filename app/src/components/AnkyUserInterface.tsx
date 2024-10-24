import React from "react";
import { ScrollView, View, Text, Image, StyleSheet } from "react-native";
import { Message, PlaygroundMode } from "@/src/types/AnkyTypes";

interface AnkyUserInterfaceProps {
  messages: Message[];
  mode: PlaygroundMode;
}

const AnkyUserInterface: React.FC<AnkyUserInterfaceProps> = ({
  messages,
  mode,
}) => {
  const renderMessage = (message: Message) => {
    switch (message.type) {
      case "text":
        return (
          <View
            style={[
              styles.messageBubble,
              message.role === "user"
                ? styles.userBubble
                : styles.assistantBubble,
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        );
      case "image":
        return (
          <View style={styles.imageContainer}>
            <Image source={{ uri: message.content }} style={styles.image} />
          </View>
        );
      case "audio":
        return (
          <View style={styles.audioBubble}>
            <Text style={styles.audioText}>🎵 Audio message</Text>
          </View>
        );
      case "code":
        return (
          <View style={styles.codeBubble}>
            <Text style={styles.codeText}>{message.content}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {messages.map((message, index) => (
        <View key={index} style={styles.messageContainer}>
          {renderMessage(message)}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    marginBottom: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E5EA",
  },
  messageText: {
    fontSize: 16,
  },
  imageContainer: {
    alignItems: "center",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  audioBubble: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#4CD964",
    alignSelf: "flex-start",
  },
  audioText: {
    color: "white",
    fontSize: 16,
  },
  codeBubble: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#1C1C1E",
    alignSelf: "flex-start",
  },
  codeText: {
    color: "#4CD964",
    fontFamily: "monospace",
    fontSize: 14,
  },
});

export default AnkyUserInterface;
