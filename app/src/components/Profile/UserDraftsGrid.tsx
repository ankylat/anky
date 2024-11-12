import React from "react";
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Alert,
} from "react-native";
import { WritingSession } from "@/src/types/Anky";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserDraftsGridProps {
  userDrafts: WritingSession[];
}

const UserDraftsGrid: React.FC<UserDraftsGridProps> = ({ userDrafts }) => {
  if (!userDrafts?.length) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-lg text-gray-500 text-center">
          You don't have any drafts yet.
        </Text>
        <Text className="text-sm text-gray-400 text-center mt-2">
          Your writing sessions will appear here.
        </Text>
      </View>
    );
  }

  const DraftItem = ({
    draft,
    index,
  }: {
    draft: WritingSession;
    index: number;
  }) => {
    const position = new Animated.Value(0);

    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          // Only allow left swipe
          position.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Threshold to show delete button
          Animated.spring(position, {
            toValue: -75,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(position, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });

    const handleDelete = async () => {
      Alert.alert(
        "Delete Draft",
        "Are you sure you want to delete this draft?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const storedDrafts = await AsyncStorage.getItem(
                  "writingSessions"
                );
                if (storedDrafts) {
                  const drafts = JSON.parse(storedDrafts);
                  drafts.splice(index, 1);
                  await AsyncStorage.setItem(
                    "writingSessions",
                    JSON.stringify(drafts)
                  );
                }
              } catch (error) {
                console.error("Error deleting draft:", error);
              }
            },
          },
        ]
      );
    };

    return (
      <View className="relative">
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateX: position }],
          }}
          className="bg-white border-b border-gray-200 p-4"
        >
          <Text className="text-lg font-medium" numberOfLines={1}>
            {draft.writing?.substring(0, 50)}...
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {new Date(draft.starting_timestamp).toLocaleDateString()}
          </Text>
        </Animated.View>
        <TouchableOpacity
          onPress={handleDelete}
          className="absolute right-0 top-0 bottom-0 bg-red-500 justify-center w-[75px]"
        >
          <Text className="text-white text-center">Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {userDrafts.map((draft, index) => (
        <DraftItem key={draft.session_id} draft={draft} index={index} />
      ))}
    </View>
  );
};

export default UserDraftsGrid;
