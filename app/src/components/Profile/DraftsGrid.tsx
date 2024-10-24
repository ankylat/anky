import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import DraftElement from "./DraftElement";
import { formatDistanceToNow } from "date-fns";
import { WritingSession } from "../../types/Anky";

interface DraftsGridProps {
  drafts: WritingSession[];
}

const DraftsGrid: React.FC<DraftsGridProps> = ({ drafts }) => {
  const navigation = useNavigation();
  console.log("the drafts are", JSON.stringify(drafts, null, 2));

  const handleDeleteDraft = async (draftId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete draft with id:", draftId);
  };

  const renderDraftItem = ({ item }: { item: WritingSession }) => {
    const renderRightActions = () => {
      return (
        <View className="flex-row">
          <TouchableOpacity
            className="bg-blue-500 justify-center items-center w-16"
            onPress={() => alert("wena choro")}
          >
            <Text className="text-white">Options</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500 justify-center items-center w-16"
            onPress={() => handleDeleteDraft(item.session_id)}
          >
            <Text className="text-white">Delete</Text>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <Swipeable renderRightActions={renderRightActions}>
        <DraftElement
          preview={item.content.substring(0, 100) + "..."}
          wordCount={item.content.split(" ").length}
          createdAt={formatDistanceToNow(new Date(item.timestamp), {
            addSuffix: true,
          })}
          onPress={() => alert("draft tapped")}
        />
      </Swipeable>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <Text className="text-2xl font-bold text-center my-4">Your Drafts</Text>
      {drafts.length === 0 ? (
        <Text className="text-center mt-4">You don't have any drafts yet.</Text>
      ) : (
        <FlatList
          data={drafts}
          renderItem={renderDraftItem}
          keyExtractor={(item) => item.session_id}
          className="px-4"
        />
      )}
    </View>
  );
};

export default DraftsGrid;
