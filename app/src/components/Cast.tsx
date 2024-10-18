import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { Cast } from "@/src/types/Cast";
import { usePrivy } from "@privy-io/expo";

interface CastElementProps {
  cast: Cast;
  isInModal?: boolean;
}

const CastElement: React.FC<CastElementProps> = ({
  cast,
  isInModal = false,
}) => {
  const [isTextExpanded, setIsTextExpanded] = useState(isInModal);
  const { user } = usePrivy();

  const toggleTextExpansion = () => {
    if (!isInModal) {
      setIsTextExpanded(!isTextExpanded);
    }
  };

  const handleEllipsisPress = useCallback(() => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to interact with casts.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log In", onPress: () => {} }, // You might want to implement a login function here
        ]
      );
      return;
    }

    const options = [
      { text: "Save Image", onPress: handleSaveImage },
      { text: "Report", onPress: handleReport },
      { text: "Share", onPress: handleShare },
    ];

    if (user.id === cast.author?.fid.toString()) {
      options.push({ text: "Delete", onPress: handleDelete });
    }

    Alert.alert(
      "Cast Options",
      "Choose an action",
      options.map((option) => ({
        text: option.text,
        onPress: option.onPress,
      })),
      { cancelable: true }
    );
  }, [user, cast]);

  const handleSaveImage = async () => {
    if (cast.embeds[0]?.url) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          const fileUri = `${FileSystem.cacheDirectory}temp_image.jpg`;
          await FileSystem.downloadAsync(cast.embeds[0].url, fileUri);

          if (Platform.OS === "android") {
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            await MediaLibrary.createAlbumAsync("Casts", asset, false);
          } else {
            await MediaLibrary.saveToLibraryAsync(fileUri);
          }

          await FileSystem.deleteAsync(fileUri, { idempotent: true });
          Alert.alert("Success", "Image saved to gallery");
        } else {
          Alert.alert(
            "Permission required",
            "Please allow access to save images"
          );
        }
      } catch (error) {
        console.error("Error saving image:", error);
        Alert.alert("Error", "Failed to save image");
      }
    } else {
      Alert.alert("No Image", "This cast doesn't contain an image to save");
    }
  };

  const handleReport = () => {
    Alert.alert("Report", "This feature is not implemented yet");
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this cast by @${cast.author.username}: ${cast.text}`,
      });
      if (result.action === Share.sharedAction) {
        console.log(
          result.activityType ? `Shared with ${result.activityType}` : "Shared"
        );
      } else if (result.action === Share.dismissedAction) {
        console.log("Dismissed");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while sharing");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Cast", "Are you sure you want to delete this cast?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          console.log("Deleting cast:", cast?.hash);
          Alert.alert("Deleted", "Cast has been deleted");
        },
      },
    ]);
  };

  const handleInteraction = useCallback(
    (action: string) => {
      if (!user) {
        Alert.alert(
          "Authentication Required",
          "Please log in to interact with casts.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Log In", onPress: () => {} }, // You might want to implement a login function here
          ]
        );
        return;
      }
      alert(`${action} pressed`);
    },
    [user]
  );

  return (
    <View className="mb-4">
      <View className="flex-row px-2 py-2 w-full">
        <TouchableOpacity
          onPress={() => handleInteraction("Profile")}
          className=""
        >
          <View className="flex-row items-center justify-between">
            <Image
              source={{ uri: cast.author.pfp_url }}
              className="w-12 h-12 rounded-full"
            />
            <Text className="ml-2 text-2xl font-bold">
              @{cast.author.username}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleEllipsisPress}
          className="mr-2 ml-auto flex-row items-center justify-center"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="ellipsis-horizontal" size={24} color="black" />
          </View>
        </TouchableOpacity>
      </View>

      {cast.embeds[0]?.url ? (
        <Image
          source={{ uri: cast.embeds[0].url }}
          className="aspect-square w-full"
          resizeMode="cover"
        />
      ) : (
        <View className="aspect-square w-full bg-gray-200" />
      )}
      <View className="w-full flex-row  px-4 py-2 justify-between bg-red-200 mt-2">
        <View className="flex-row gap-2 ">
          <TouchableOpacity onPress={() => handleInteraction("Comment")}>
            <Ionicons name="chatbubble-outline" size={28} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleInteraction("Recast")}>
            <Ionicons name="sync-outline" size={28} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleInteraction("Like")}>
            <Ionicons name="heart-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>
        <View className="ml-auto flex-row gap-2 ">
          <TouchableOpacity onPress={() => handleInteraction("Mint NFT")}>
            <Ionicons name="diamond-outline" size={28} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleInteraction("Share")}>
            <Ionicons name="paper-plane-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      <View className="p-2">
        <Text className="text-lg font-bold mb-2">{cast.author.username}</Text>
        <TouchableOpacity onPress={toggleTextExpansion}>
          <Text
            className="text-sm text-gray-800"
            numberOfLines={isTextExpanded ? undefined : 3}
          >
            {cast.text}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CastElement;