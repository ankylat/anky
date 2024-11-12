import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Anky } from "@/src/types/Anky";
import { ScrollView } from "react-native-actions-sheet";

interface UserAnkysGridProps {
  userAnkys: Anky[];
}

const UserAnkysGrid: React.FC<UserAnkysGridProps> = ({ userAnkys }) => {
  const screenWidth = Dimensions.get("window").width;
  const itemSize = screenWidth / 3;
  const [selectedAnky, setSelectedAnky] = useState<Anky | null>(null);

  if (!userAnkys?.length) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-lg text-gray-500 text-center">
          You haven't created any Ankys yet.
        </Text>
        <Text className="text-sm text-gray-400 text-center mt-2">
          Complete writing sessions to create your first Anky.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Modal
        animationType="slide"
        transparent={false}
        visible={selectedAnky !== null}
        onRequestClose={() => setSelectedAnky(null)}
      >
        <View className="flex-1 bg-black">
          <TouchableOpacity
            className="absolute top-10 right-4 z-10"
            onPress={() => setSelectedAnky(null)}
          >
            <Text className="text-white text-xl">✕</Text>
          </TouchableOpacity>
          {selectedAnky && (
            <View className="flex-1 justify-center items-center">
              <Image
                source={
                  selectedAnky.image_url
                    ? { uri: selectedAnky.image_url }
                    : require("@/assets/images/anky.png")
                }
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </Modal>

      <ScrollView>
        <View className="flex-row flex-wrap">
          {userAnkys.map((anky, index) => (
            <TouchableOpacity
              key={anky.id || index}
              style={{ width: itemSize, height: itemSize }}
              className="p-0.5"
              onPress={() => setSelectedAnky(anky)}
            >
              <Image
                source={
                  anky.image_url
                    ? { uri: anky.image_url }
                    : require("@/assets/images/anky.png")
                }
                style={{ width: "100%", height: "100%" }}
                className="rounded-sm"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default UserAnkysGrid;
