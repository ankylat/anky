import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAnky } from "@/src/context/AnkyContext";
import {
  extractSessionDataFromLongString,
  sendWritingSessionConversationToAnky,
} from "../lib/anky";

interface Message {
  id: number;
  text: string;
  isAnky: boolean;
  timestamp: string;
}

const { width } = Dimensions.get("window");

const AnkyverseDialog = () => {
  const [userText, setUserText] = useState("");
  const [isAnkyTyping, setIsAnkyTyping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const { conversationWithAnky, setConversationWithAnky } = useAnky();

  const messages: Message[] = conversationWithAnky.map((text, index) => {
    const isAnky = index % 2 === 0;
    let reply_text = text;
    if (!isAnky) {
      reply_text = extractSessionDataFromLongString(text).session_text;
    }
    return {
      id: index,
      text: reply_text,
      isAnky: index % 2 === 0,
      timestamp: new Date().toISOString(),
    };
  });

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      // Small timeout to ensure content is rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  useEffect(() => {
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const handleUserResponse = async () => {
    if (!userText.trim()) return;

    // Add user's stream of consciousness to conversation
    setConversationWithAnky((prev) => [...prev, userText]);
    setUserText("");

    // Simulate Anky typing response
    setIsAnkyTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsAnkyTyping(false);

    const ankyResponse = await sendWritingSessionConversationToAnky(
      conversationWithAnky
    );
    setConversationWithAnky((prev) => [...prev, ankyResponse]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAnky = item.isAnky;

    return (
      <View
        style={[
          styles.messageContainer,
          isAnky ? styles.ankyMessageContainer : styles.userMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isAnky ? styles.ankyBubble : styles.userBubble,
          ]}
        >
          {item.text.split("\n").map((paragraph, index) => (
            <Text
              key={index}
              style={[
                styles.messageText,
                isAnky ? styles.ankyMessageText : styles.userMessageText,
                index > 0 && { marginTop: 8 },
              ]}
            >
              {paragraph}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Messages */}
      <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {isAnkyTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Anky is typing...</Text>
          </View>
        )}
      </Animated.View>
      {/* Input Area */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  comingSoonText: {
    color: "#666",
    fontStyle: "italic",
  },
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: width * 0.8,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  ankyMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: "#6b46c1",
  },
  ankyBubble: {
    backgroundColor: "#2d2d2d",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: {
    color: "#fff",
  },
  ankyMessageText: {
    color: "#e9d8fd",
  },
  typingIndicator: {
    padding: 16,
  },
  typingText: {
    color: "#666",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#2d2d2d",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#404040",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#fff",
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#6b46c1",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default AnkyverseDialog;
