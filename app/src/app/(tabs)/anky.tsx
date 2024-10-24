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
  Animated,
  ActivityIndicator,
} from "react-native";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PromptOption {
  text: string;
  summary: string;
  color: string;
}

const promptOptions: PromptOption[] = [
  {
    text: "Imagine you're Terence McKenna exploring the far reaches of the psychedelic multiverse. What alien landscapes do you encounter?",
    summary: "McKenna's Multiverse",
    color: "#FF69B4",
  },
  {
    text: "As Ramana Maharshi, if you could communicate with the universe, what profound truths would it reveal to you?",
    summary: "Maharshi's Universal Truths",
    color: "#4CAF50",
  },
  {
    text: "Channel your inner David Foster Wallace. If thoughts were tangible objects, how would you describe the clutter of the human mind?",
    summary: "Wallace's Mind Clutter",
    color: "#FFA500",
  },
  {
    text: "As Alex Grey, paint a world where emotions are visible as vibrant colors and patterns. What does it look like?",
    summary: "Grey's Emotional Canvas",
    color: "#9C27B0",
  },
  {
    text: "Imagine you're Albert Hofmann on a journey through the molecular structure of consciousness. What do you discover?",
    summary: "Hofmann's Consciousness Journey",
    color: "#2196F3",
  },
  {
    text: "As Carl Jung, if you could map the collective unconscious, what archetypes and symbols would you find?",
    summary: "Jung's Archetype Map",
    color: "#F44336",
  },
  {
    text: "Channel your inner Timothy Leary. What's the most mind-expanding experience you've ever had?",
    summary: "Leary's Mind Expansion",
    color: "#00BCD4",
  },
  {
    text: "As Alan Watts, describe a moment of pure enlightenment. What does it feel like?",
    summary: "Watts' Enlightenment",
    color: "#FFEB3B",
  },
  {
    text: "Imagine you're J.K. Rowling. What would a day in the life of your favorite book character be like?",
    summary: "Rowling's Character Day",
    color: "#795548",
  },
  {
    text: "As ancient Roman emperor Julius Caesar, if you could invent a new holiday, what would it celebrate?",
    summary: "Caesar's Holiday",
    color: "#607D8B",
  },
  {
    text: "Channel your inner Sherlock Holmes. What's the most interesting conversation you've overheard?",
    summary: "Holmes' Overheard Talk",
    color: "#E91E63",
  },
  {
    text: "As Stephen King, if you could have dinner with any fictional villain, who would it be and why?",
    summary: "King's Villain Dinner",
    color: "#673AB7",
  },
  {
    text: "Imagine you're Isaac Newton. What would happen if gravity reversed for just one minute every day?",
    summary: "Newton's Reverse Gravity",
    color: "#3F51B5",
  },
  {
    text: "As Leonardo da Vinci, if you could add one new feature to the human body, what would it be?",
    summary: "Da Vinci's Body Upgrade",
    color: "#009688",
  },
  {
    text: "Channel your inner Indiana Jones. What's the most unusual place you've ever fallen asleep?",
    summary: "Indy's Unusual Sleep",
    color: "#8BC34A",
  },
  {
    text: "As Charles Darwin, if you could combine any two animals to create a new species, what would you choose?",
    summary: "Darwin's Animal Fusion",
    color: "#CDDC39",
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInputActive, setIsInputActive] = useState(false);
  const [randomPrompts, setRandomPrompts] = useState<PromptOption[]>([]);
  const [unusedPrompts, setUnusedPrompts] = useState<PromptOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "welcome home, dear reader. or writer, if you dare to. your mission is to do it for 8 minutes every day. we will do the rest (or it will happen on its own)",
      },
    ]);

    const shuffled = [...promptOptions].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 3));
    setUnusedPrompts(shuffled.slice(3));
  }, []);

  const handleSendMessage = async (content: string) => {
    if (content.trim() === "") return;

    console.log("Sending message:", content);

    const newMessage: Message = {
      role: "user",
      content: content.trim(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputText("");
    setLoading(true);

    try {
      console.log("Sending request to API");
      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_ANKY_API_URL}/talk-to-anky?json_formatting=false`,
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
    } finally {
      setLoading(false);
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

  const replacePrompt = (index: number) => {
    if (unusedPrompts.length === 0) return;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      const newPrompt = unusedPrompts[0];
      const newRandomPrompts = [...randomPrompts];
      newRandomPrompts[index] = newPrompt;
      setRandomPrompts(newRandomPrompts);
      setUnusedPrompts(unusedPrompts.slice(1));

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

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
        <Animated.View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
            paddingHorizontal: 10,
            opacity: fadeAnim,
          }}
        >
          {randomPrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: prompt.color,
                paddingVertical: 10,
                paddingHorizontal: 15,
                borderRadius: 20,
                flex: 1,
                marginHorizontal: index === 1 ? 5 : 0,
              }}
              onPress={() => {
                handleSendMessage(prompt.text);
                replacePrompt(index);
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {prompt.summary}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
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
              handleSendMessage(inputText);
            }}
          >
            <Text style={{ color: "white" }}>Ask Anky</Text>
          </TouchableOpacity>
        </View>
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          >
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
