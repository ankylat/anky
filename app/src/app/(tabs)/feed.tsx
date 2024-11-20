import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getLandingFeed } from "@/src/api/feed";
import { useTranslation } from "react-i18next";
import Feed from "@/src/components/feed/Feed";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<"us" | "followed">("us");
  const { t } = useTranslation();

  const { data: ankyFeed, isLoading } = useQuery({
    queryKey: ["ankyFeed", activeTab],
    queryFn: async () => {
      return getLandingFeed({
        fid: 18350,
        viewer_fid: undefined,
        cursor: "",
        limit: activeTab === "us" ? 24 : 12,
      });
    },
  });

  return (
    <View className="flex-1 bg-black">
      {/* Tab Navigation */}
      <View className="flex-row justify-center space-x-8 pt-16 pb-4">
        {["us", "followed"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as "us" | "followed")}
            className={`px-6 py-2 rounded-full ${
              activeTab === tab ? "bg-white/10" : ""
            }`}
          >
            <Text
              className={`text-white text-lg ${
                activeTab === tab ? "opacity-100" : "opacity-60"
              }`}
            >
              {t(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Feed
        casts={ankyFeed?.casts || []}
        cursor={ankyFeed?.next?.cursor || ""}
        onLoadMore={async (cursor) => {
          await getLandingFeed({
            fid: 18350,
            viewer_fid: undefined,
            cursor: cursor,
            limit: activeTab === "us" ? 24 : 12,
          });
        }}
        isLoading={isLoading}
      />
    </View>
  );
}
