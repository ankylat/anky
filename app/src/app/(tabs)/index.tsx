import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useUser } from "../../context/UserContext";
import CastElement from "../../components/Cast";

export default function HomeScreen() {
  const { casts, isLoading, error } = useUser();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {casts.map((cast, index) => (
        <CastElement key={index} cast={cast} />
      ))}
    </ScrollView>
  );
}
