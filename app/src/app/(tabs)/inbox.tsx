import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ListRenderItem,
} from "react-native";

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  color: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

const InboxScreen: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");

  const chats: Chat[] = [
    {
      id: "1",
      name: "Alice",
      lastMessage: "Hey, how are you?",
      color: "#FF5733",
    },
    {
      id: "2",
      name: "Bob",
      lastMessage: "Did you see the game last night?",
      color: "#33FF57",
    },
    {
      id: "3",
      name: "Charlie",
      lastMessage: "Meeting at 3pm today",
      color: "#3357FF",
    },
  ];

  const messages: Message[] = [
    {
      id: "1",
      sender: "Alice",
      content: "Hey, how are you?",
      timestamp: "10:30 AM",
    },
    {
      id: "2",
      sender: "You",
      content: "I'm good, thanks! How about you?",
      timestamp: "10:32 AM",
    },
    {
      id: "3",
      sender: "Alice",
      content: "Doing great! Any plans for the weekend?",
      timestamp: "10:35 AM",
    },
  ];

  const renderChat: ListRenderItem<Chat> = ({ item }) => (
    <TouchableOpacity
      className="flex-row items-center bg-white p-4 rounded-lg mb-2 shadow-sm"
      onPress={() => setSelectedChat(item)}
    >
      <View
        className="w-12 h-12 rounded-full mr-3 items-center justify-center"
        style={{ backgroundColor: item.color }}
      >
        <Text className="text-white font-bold text-lg">{item.name[0]}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-800">{item.name}</Text>
        <Text className="text-sm text-gray-600">{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <View
      className={`p-3 rounded-lg mb-1 max-w-3/4 ${
        item.sender === "You" ? "bg-blue-100 self-end" : "bg-white self-start"
      }`}
    >
      <Text className="text-sm text-gray-800">{item.content}</Text>
      <Text className="text-xs text-gray-500 mt-1">{item.timestamp}</Text>
    </View>
  );

  const sendMessage = (): void => {
    if (newMessage.trim()) {
      // Here you would typically add the new message to your messages array
      // and possibly send it to a backend. For this example, we'll just clear the input.
      setNewMessage("");
    }
  };

  return (
    <View className="flex-1 bg-gray-100">
      {!selectedChat ? (
        <>
          <FlatList
            data={chats}
            renderItem={renderChat}
            keyExtractor={(item) => item.id}
            className="flex-1 p-2"
          />
        </>
      ) : (
        <>
          <View className="flex-row items-center p-4 bg-blue-500">
            <TouchableOpacity onPress={() => setSelectedChat(null)}>
              <Text className="text-white mr-3">←</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">
              {selectedChat.name}
            </Text>
          </View>
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            className="flex-1 p-2"
          />
          <View className="flex-row p-2 bg-white">
            <TextInput
              className="flex-1 bg-gray-200 rounded-full px-4 py-2 mr-2"
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
            />
            <TouchableOpacity
              className="bg-blue-500 rounded-full px-5 py-2 justify-center"
              onPress={sendMessage}
            >
              <Text className="text-white font-bold">Send</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default InboxScreen;
