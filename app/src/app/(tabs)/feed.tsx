import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getLandingFeed } from "@/src/api/feed";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdvancedImage } from "cloudinary-react-native";
import { Cloudinary, CloudinaryImage } from "@cloudinary/url-gen";
import { scale } from "@cloudinary/url-gen/actions/resize";
import { quality, format } from "@cloudinary/url-gen/actions/delivery";
import { auto } from "@cloudinary/url-gen/qualifiers/quality";
import { auto as autoFormat } from "@cloudinary/url-gen/qualifiers/format";
import { Cast } from "@/src/types/Cast";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

// Initialize Cloudinary instance
const cld = new Cloudinary({
  cloud: {
    cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  },
  url: {
    secure: true, // Setting secure URLs like in image_services.go
  },
});

export default function HomeScreen() {
  const [selectedAnky, setSelectedAnky] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"todos" | "followed">("todos");
  const { width: screenWidth } = Dimensions.get("window");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const viewer_fid = AsyncStorage.getItem("anky_user_fid");
  const { t } = useTranslation();

  const { data: ankyFeed, isLoading } = useQuery({
    queryKey: ["ankyFeed", activeTab],
    queryFn: async () => {
      const fid = await viewer_fid;
      return getLandingFeed({
        fid: Number(fid),
        viewer_fid: Number(fid),
        cursor: "",
        limit: activeTab === "todos" ? 24 : 12,
      });
    },
  });

  const handleTabPress = (tab: "todos" | "followed") => {
    setActiveTab(tab);
  };

  const handleAnkyPress = (ankyId: number) => {
    setSelectedAnky(ankyId);
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  };

  const handleCloseModal = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start(() => {
      setSelectedAnky(null);
    });
  };

  const getOptimizedImage = (url: string, width: number): CloudinaryImage => {
    const publicId = url.split("/").pop()?.split(".")[0];
    if (!publicId) return cld.image("default");

    return cld
      .image(publicId)
      .resize(scale().width(width))
      .delivery(quality(auto()))
      .delivery(format(autoFormat()));
  };

  const getLayoutPattern = (index: number) => {
    const patterns = [
      { span: 1, height: screenWidth / 3 },
      { span: 2, height: (screenWidth / 3) * 2 },
      { span: 3, height: screenWidth },
      { span: 2, height: screenWidth / 2 },
    ];
    return patterns[index % patterns.length];
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Cast; index: number }) => {
      const pattern = getLayoutPattern(index);
      const imageWidth =
        (screenWidth / 3) * pattern.span - (pattern.span > 1 ? 8 : 4);

      return (
        <TouchableOpacity
          onPress={() => handleAnkyPress(index)}
          style={{
            width: imageWidth,
            height: pattern.height,
            margin: 2,
          }}
        >
          <AdvancedImage
            cldImg={getOptimizedImage(item.embeds[0].url, imageWidth * 2)}
            style={{
              flex: 1,
              borderRadius: 12,
            }}
          />
        </TouchableOpacity>
      );
    },
    [screenWidth]
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">Loading your beautiful feed...</Text>
      </View>
    );
  }

  if (!ankyFeed?.casts.length) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">No ankys found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View className="flex-row justify-center space-x-8 py-2 bg-black/90">
        <TouchableOpacity
          onPress={() => handleTabPress("todos")}
          className={`px-4 py-2 ${
            activeTab === "todos" ? "border-b border-white" : ""
          }`}
        >
          <Text
            className={`text-white text-lg ${
              activeTab === "todos" ? "opacity-100" : "opacity-70"
            }`}
          >
            {t("todos")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleTabPress("followed")}
          className={`px-4 py-2 ${
            activeTab === "followed" ? "border-b border-white" : ""
          }`}
        >
          <Text
            className={`text-white text-lg ${
              activeTab === "followed" ? "opacity-100" : "opacity-70"
            }`}
          >
            {t("followed")}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ankyFeed.casts}
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={{ padding: 2 }}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        keyExtractor={(item) => item.hash}
      />

      <Modal
        visible={selectedAnky !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          className="flex-1 bg-black/80 justify-center items-center p-4"
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <Animated.View
            className="bg-black rounded-xl p-4 w-full"
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            {selectedAnky !== null && ankyFeed && (
              <View>
                <AdvancedImage
                  cldImg={getOptimizedImage(
                    ankyFeed.casts[selectedAnky].embeds[0].url,
                    screenWidth * 2
                  )}
                  style={{
                    width: "100%",
                    height: screenWidth * 0.8,
                    borderRadius: 12,
                  }}
                />

                <View className="flex-row justify-between mt-4">
                  <View className="flex-row space-x-6">
                    <TouchableOpacity>
                      <Ionicons name="heart-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Ionicons name="sync-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Ionicons
                        name="chatbubble-outline"
                        size={24}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row space-x-4">
                    <TouchableOpacity>
                      <Ionicons
                        name="diamond-outline"
                        size={24}
                        color="white"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Ionicons name="share-outline" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-white mt-4">
                  {ankyFeed.casts[selectedAnky].text}
                </Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
