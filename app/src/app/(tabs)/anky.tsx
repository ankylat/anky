import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function ChatScreen() {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    updateDisplayedMessages();
  }, [messages, page]);

  const loadChatHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem("chatHistory");
      if (storedHistory) {
        setMessages(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const updateDisplayedMessages = () => {
    const startIndex = Math.max(0, messages.length - page * 10);
    const endIndex = messages.length;
    setDisplayedMessages(messages.slice(startIndex, endIndex).reverse());
  };

  const saveChatHistory = async (newHistory: Message[]) => {
    try {
      await AsyncStorage.setItem("chatHistory", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  };

  const sendMessage = async () => {
    if (message.trim() === "") return;

    const newMessage: Message = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_ANKY_API_URL}/talk-to-anky`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: message }],
          }),
        }
      );
      const data = await response.json();
      if (data && data.response) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
        };
        const newUpdatedMessages = [...updatedMessages, assistantMessage];
        setMessages(newUpdatedMessages);
        saveChatHistory(newUpdatedMessages);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChatItem = ({ item }: { item: Message }) => (
    <View
      className={`p-2.5 rounded-lg mb-2.5 max-w-[70%] ${
        item.role === "user"
          ? "self-end bg-green-200"
          : "self-start bg-gray-200"
      }`}
    >
      <Text>{item.content}</Text>
      <Text className="text-xs text-gray-500 self-end mt-1">
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  const loadMoreMessages = () => {
    if (page * 10 < messages.length) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="flex-1 p-5">
        <FlatList
          data={displayedMessages}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.timestamp.toString()}
          className="flex-1"
          inverted
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.1}
        />
        <View className="flex-row mt-2.5">
          <TextInput
            className="flex-1 h-10 border border-gray-300 rounded-full px-2.5 text-base mr-2.5"
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            editable={!isLoading}
          />
          <TouchableOpacity
            className="justify-center items-center bg-blue-500 rounded-full px-5"
            onPress={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
