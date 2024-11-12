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

// Types
interface Message {
  id: number;
  sender: "user" | "ankyverse";
  text: string;
  type: "greeting" | "response" | "inquiry" | "calendar" | "offering";
  timestamp: string;
}

const { width } = Dimensions.get("window");

const AnkyverseDialog = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userText, setUserText] = useState("");
  const [isWritingComplete, setIsWritingComplete] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const [isAnkyverseTyping, setIsAnkyverseTyping] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Initialize current day in Ankyverse calendar format
  useEffect(() => {
    const initializeDialog = async () => {
      const date = new Date();
      const week = Math.ceil(date.getDate() / 7);
      const day = `s${date.getFullYear().toString().slice(2)}w${week
        .toString()
        .padStart(2, "0")}d${date.getDate().toString().padStart(2, "0")}`;
      setCurrentDay(day);

      // Initial greeting
      addMessage({
        sender: "ankyverse",
        text: `Welcome to ${day} of the Ankyverse. You've just completed your writing ritual. Would you like to explore what emerged from your stream of consciousness?`,
        type: "greeting",
      });
    };

    initializeDialog();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const newMessage = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...message,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Scroll to bottom after message is added
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    []
  );

  const simulateAnkyverseTyping = useCallback(async () => {
    setIsAnkyverseTyping(true);
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 1000)
    );
    setIsAnkyverseTyping(false);
  }, []);

  const handleUserResponse = async () => {
    if (!userText.trim()) return;

    // Add user message
    addMessage({
      sender: "user",
      text: userText,
      type: "response",
    });

    setUserText("");
    await simulateAnkyverseTyping();

    // Ankyverse response based on conversation stage
    const messageCount = messages.length;

    if (messageCount === 1) {
      addMessage({
        sender: "ankyverse",
        text: "I sense both clarity and uncertainty in your words. Let's explore what patterns emerged during your writing. What stood out to you the most?",
        type: "inquiry",
      });
    } else if (messageCount === 3) {
      addMessage({
        sender: "ankyverse",
        text: "The Ankyverse calendar suggests that today's energy aligns with introspection and creative expression. How does this resonate with what you wrote?",
        type: "calendar",
      });
    } else if (messageCount === 5) {
      addMessage({
        sender: "ankyverse",
        text: "Your writing will be preserved in the Ankyverse as a unique timestamp of your journey. Would you like to receive a crystal that captures the essence of today's reflection?",
        type: "offering",
      });
    } else if (messageCount === 7) {
      setIsWritingComplete(true);
      // Save dialog to AsyncStorage
      try {
        const dialogData = {
          date: currentDay,
          messages: messages,
          completedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `dialog_${currentDay}`,
          JSON.stringify(dialogData)
        );
      } catch (error) {
        console.error("Error saving dialog:", error);
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser
            ? styles.userMessageContainer
            : styles.ankyverseMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.ankyverseBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.ankyverseMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{currentDay}</Text>
      </View>

      {/* Messages */}
      <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
        />

        {isAnkyverseTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, { marginLeft: 4 }]} />
            <View style={[styles.typingDot, { marginLeft: 4 }]} />
          </View>
        )}
      </Animated.View>

      {/* Input Area */}
      {!isWritingComplete && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            value={userText}
            onChangeText={setUserText}
            placeholder="Share your thoughts..."
            placeholderTextColor="#666"
            onSubmitEditing={handleUserResponse}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleUserResponse}
            disabled={!userText.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

      {/* Completion Overlay */}
      {isWritingComplete && (
        <View style={styles.completionOverlay}>
          <View style={styles.completionDialog}>
            <Text style={styles.completionTitle}>Journey Complete</Text>
            <Text style={styles.completionText}>
              Your reflection has been preserved in the Ankyverse. A crystal has
              been generated to commemorate this moment.
            </Text>
            <TouchableOpacity
              style={styles.newJourneyButton}
              onPress={() => setIsWritingComplete(false)}
            >
              <Text style={styles.newJourneyButtonText}>Begin New Journey</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    padding: 16,
    backgroundColor: "#2d2d2d",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  ankyverseMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: "#6b46c1",
  },
  ankyverseBubble: {
    backgroundColor: "#2d2d2d",
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  userMessageText: {
    color: "#fff",
  },
  ankyverseMessageText: {
    color: "#e9d8fd",
  },
  timestamp: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  typingIndicator: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6b46c1",
    opacity: 0.6,
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
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  completionDialog: {
    backgroundColor: "#2d2d2d",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    alignItems: "center",
  },
  completionTitle: {
    color: "#e9d8fd",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  completionText: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  newJourneyButton: {
    backgroundColor: "#6b46c1",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  newJourneyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AnkyverseDialog;
