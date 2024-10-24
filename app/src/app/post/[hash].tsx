import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useUser } from "../../context/UserContext";
import { Cast } from "../../types/Cast";
import CastElement from "../../components/Cast";

export default function PostScreen() {
  const { castHash } = useLocalSearchParams();
  const { casts, refreshUserData } = useUser();
  const [post, setPost] = useState<Cast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      await refreshUserData(); // Refresh user data to ensure we have the latest casts
      const foundPost = casts.find((cast: Cast) => cast.hash === castHash);
      setPost(foundPost || null);
      setLoading(false);
    };

    fetchPost();
  }, [castHash, refreshUserData]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Post not found</Text>
      </View>
    );
  }

  return <CastElement cast={post} />;
}
