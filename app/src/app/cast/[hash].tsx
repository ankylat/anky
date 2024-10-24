import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Cast } from "../../types/Cast";
import CastElement from "../../components/Cast";
import { useQuery } from "@tanstack/react-query";
import { getCast } from "@/src/api/feed";

export default function PostScreen() {
  const { hash } = useLocalSearchParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["getCast", hash],
    queryFn: () => getCast(hash as string, ""),
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>This Anky doesnt exist</Text>
      </View>
    );
  }

  return <CastElement cast={post} />;
}
