import React, { useRef, useState, useCallback, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Cast } from "@/src/types/Cast";
import { useUser } from "@/src/context/UserContext";
import { useAnky } from "@/src/context/AnkyContext";
import { Link } from "expo-router";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export default function HomeScreen() {
  const [selectedAnky, setSelectedAnky] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"todos" | "followed">("todos");
  const { width: screenWidth } = Dimensions.get("window");
  const { t } = useTranslation();
  const { ankyUser, createAccountModalVisible, setCreateAccountModalVisible } =
    useUser();

  // Animation values
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const gridItemScale = useRef<{ [key: number]: Animated.Value }>({}).current;

  const { data: ankyFeed, isLoading } = useQuery({
    queryKey: ["ankyFeed", activeTab],
    queryFn: async () => {
      return getLandingFeed({
        fid: 18350,
        viewer_fid: undefined,
        cursor: "",
        limit: activeTab === "todos" ? 24 : 12,
      });
    },
  });

  const handleAnkyPress = useCallback((ankyId: number) => {
    setSelectedAnky(ankyId);

    // Run animations
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCloseModal = useCallback(() => {
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedAnky(null);
    });
  }, []);

  const renderGridItem = useCallback(
    ({ item, index }: { item: Cast; index: number }) => {
      // Calculate dimensions for a perfect square grid
      const itemWidth = screenWidth / 3 - 4; // 3 columns with 2px margin on each side
      const itemHeight = itemWidth; // Make it square

      if (!gridItemScale[index]) {
        gridItemScale[index] = new Animated.Value(1);
      }

      return (
        <AnimatedTouchableOpacity
          onPressIn={() => {
            Animated.spring(gridItemScale[index], {
              toValue: 0.95,
              useNativeDriver: true,
              tension: 50,
              friction: 3,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(gridItemScale[index], {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 3,
            }).start();
          }}
          onPress={() => handleAnkyPress(index)}
          style={[
            {
              width: itemWidth,
              height: itemHeight,
              margin: 2,
              transform: [{ scale: gridItemScale[index] }],
            },
          ]}
        >
          <Image
            source={{ uri: item.embeds[0].url }}
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: "#2a2a2a",
            }}
          />
        </AnimatedTouchableOpacity>
      );
    },
    [screenWidth]
  );

  const handleActionButtonPress = (action: string) => {
    // Get user state from useUser hook
    console.log("handleActionButtonPress", action);
    // Check if user is logged in with Farcaster
    if (!ankyUser?.farcaster_account?.fid) {
      console.log("Not logged in");
      // Show modal to create account if not logged in
      setCreateAccountModalVisible(true);
      return;
    }

    // If logged in, handle the specific action
    switch (action) {
      case "like":
        // Handle like action
        console.log("Like pressed");
        break;
      case "recast":
        // Handle recast action
        console.log("Recast pressed");
        break;
      case "comment":
        // Handle comment action
        console.log("Comment pressed");
        break;
      case "mint":
        // Handle mint action
        console.log("Mint pressed");
        break;
      case "share":
        // Handle share action
        console.log("Share pressed");
        break;
      default:
        console.log("Unknown action");
    }
  };

  const ActionButton = ({ icon, onPress }: ActionButtonProps) => (
    <TouchableOpacity onPress={onPress} className="items-center">
      <Animated.View
        style={{
          transform: [{ scale: modalScale }],
        }}
      >
        <Ionicons name={icon} size={28} color="white" />
      </Animated.View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">
          Loading your beautiful feed...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Tab Navigation */}
      <View className="flex-row justify-center space-x-8 pt-16 pb-4">
        {["todos", "followed"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as "todos" | "followed")}
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

      {/* Grid View */}
      <FlatList
        data={ankyFeed?.casts || []}
        renderItem={renderGridItem}
        numColumns={3}
        contentContainerStyle={{ padding: 2 }}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.hash}
      />

      {/* Modal View */}
      <Modal
        visible={selectedAnky !== null}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <Animated.View
          className="flex-1 bg-black/95"
          style={{ opacity: modalOpacity, zIndex: 1000 }}
        >
          <TouchableOpacity
            className="absolute top-12 right-6 z-10"
            onPress={handleCloseModal}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          {selectedAnky !== null && ankyFeed && (
            <Animated.View
              className="flex-1 justify-center p-4"
              style={{
                transform: [{ scale: modalScale }],
              }}
            >
              <View className="mb-2 ml-2 flex">
                <Image
                  source={{ uri: ankyFeed.casts[selectedAnky].author.pfp_url }}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 100,
                  }}
                />
                <Link href={`/u/${ankyFeed.casts[selectedAnky].author.fid}`}>
                  <Text className="text-white text-lg">
                    @{ankyFeed.casts[selectedAnky].author.username}
                  </Text>
                </Link>
              </View>
              <Image
                source={{ uri: ankyFeed.casts[selectedAnky].embeds[0].url }}
                style={{
                  width: "100%",
                  height: screenWidth,
                  borderRadius: 24,
                }}
              />

              {/* Action Buttons */}
              <View className="flex-row justify-between mt-6 px-2">
                <View className="flex-row space-x-8 gap-3 pl-2">
                  <ActionButton
                    icon="heart-outline"
                    onPress={() => handleActionButtonPress("like")}
                  />
                  <ActionButton
                    icon="sync-outline"
                    onPress={() => handleActionButtonPress("recast")}
                  />
                  <ActionButton
                    icon="chatbubble-outline"
                    onPress={() => handleActionButtonPress("comment")}
                  />
                </View>

                <View className="flex-row space-x-8 gap-3 pr-2">
                  <ActionButton
                    icon="diamond-outline"
                    onPress={() => handleActionButtonPress("mint")}
                  />
                  <ActionButton
                    icon="share-outline"
                    onPress={() => handleActionButtonPress("share")}
                  />
                </View>
              </View>

              {/* Cast Text */}
              <Text className="text-white text-lg mt-6 px-2 leading-6">
                {ankyFeed.casts[selectedAnky].text}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </Modal>
    </View>
  );
}
