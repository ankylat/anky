import React from "react";
import { View, Text } from "react-native";

interface CollectedGridProps {
  userCollection?: any[]; // TODO: Add proper type for collected Ankys
}

const CollectedGrid: React.FC<CollectedGridProps> = ({ userCollection }) => {
  if (!userCollection || userCollection.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-gray-500 text-center">
          Go to the feed and mint your first anky!
        </Text>
      </View>
    );
  }

  // TODO: Implement grid view of collected Ankys when they exist
  return <View>{/* Grid implementation will go here */}</View>;
};

export default CollectedGrid;
