import React from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import ActionSheet, {
  SheetManager,
  SheetProps,
} from "react-native-actions-sheet";
import CastElement from "@/src/components/Cast";
import { Cast } from "@/src/types/Cast";
import { Ionicons } from "@expo/vector-icons";

interface CastViewerModalProps extends SheetProps<"cast-viewer-modal"> {}

const CastViewerModal: React.FC<CastViewerModalProps> = ({
  sheetId,
  payload,
}) => {
  const cast = payload as Cast;

  return (
    <ActionSheet
      id={sheetId}
      containerStyle={{
        backgroundColor: "transparent",
        position: "relative",
        paddingBottom: "65%",
      }}
      gestureEnabled={true}
      indicatorStyle={{ backgroundColor: "transparent" }}
      elevation={0}
      overlayColor="#EEEEEEFF"
    >
      <View className="flex flex-col items-center justify-between bg-white mx-5 border-2 rounded-3xl overflow-hidden">
        <View className="flex flex-row items-start justify-center bg-blue-500 px-4 py-2 border-b-2 border-black w-full h-10">
          <Text className="text-xl font-bold text-white mt-1">Cast</Text>

          <Pressable
            className="ml-auto my-auto rounded-md opacity-50"
            onPress={() => SheetManager.hide(sheetId)}
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>

        <ScrollView className="w-full">
          <CastElement cast={cast} isInModal={true} />
        </ScrollView>

        <View className="w-full p-4 border-t border-gray-200">
          <Pressable
            className="flex flex-row justify-center items-center bg-gray-200 py-3 rounded-full border-2"
            onPress={() => SheetManager.hide(sheetId)}
          >
            <Text className="text-black text-base font-bold">Close</Text>
          </Pressable>
        </View>
      </View>
    </ActionSheet>
  );
};

export default CastViewerModal;
