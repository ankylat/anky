import React, { useState, useEffect, useRef } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInputActive, setIsInputActive] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Add welcome message from Anky
    setMessages([
      {
        role: "assistant",
        content:
          "welcome home, dear reader. or writer, if you dare to. your mission is to do it for 8 minutes every day. we will do the rest (or it will happen on its own)",
      },
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (inputText.trim() === "") return;

    console.log("Sending message:", inputText);

    const newMessage: Message = {
      role: "user",
      content: inputText.trim(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText("");

    try {
      console.log("Sending request to API");
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_ANKY_API_URL}/talk-to-anky`,
        {
          messages: updatedMessages,
        }
      );

      console.log("Received response from API:", response.data.response);

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.response,
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const activateInput = () => {
    console.log("Activating input");
    setIsInputActive(true);
    setTimeout(() => {
      console.log("Focusing input");
      inputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    console.log("Scrolling to end of messages");
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 10 }}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map((message, index) => (
            <View
              key={index}
              style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                backgroundColor:
                  message.role === "user" ? "#DCF8C6" : "#E5E5EA",
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
                maxWidth: "80%",
              }}
            >
              <Text>{message.content}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", padding: 10 }}>
          {isInputActive ? (
            <TextInput
              ref={inputRef}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 20,
                paddingHorizontal: 15,
                paddingVertical: 10,
                marginRight: 10,
              }}
              value={inputText}
              onChangeText={(text) => {
                console.log("Input text changed:", text);
                setInputText(text);
              }}
              placeholder="Type a message..."
              onBlur={() => {
                console.log("Input blurred");
                if (inputText.trim() === "") {
                  console.log("Input empty, deactivating");
                  setIsInputActive(false);
                }
              }}
            />
          ) : (
            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 20,
                paddingHorizontal: 15,
                paddingVertical: 10,
                marginRight: 10,
                justifyContent: "center",
              }}
              onPress={activateInput}
            >
              <Text style={{ color: "#999" }}>
                Can you give me three tips to deal with imposter syndrome?
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="mt-auto"
            style={{
              backgroundColor: "#007AFF",
              borderRadius: 20,
              paddingHorizontal: 20,
              height: 40,

              justifyContent: "center",
            }}
            onPress={() => {
              console.log("Send button pressed");
              handleSendMessage();
            }}
          >
            <Text style={{ color: "white" }}>Ask Anky</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
