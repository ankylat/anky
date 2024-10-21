import React from "react";
import { Pressable, Text, View, Linking, Share } from "react-native";
import ActionSheet, {
  SheetManager,
  SheetProps,
} from "react-native-actions-sheet";
import { Cast } from "../types/Cast";
import * as Clipboard from "expo-clipboard";

export default function ShareCastModal({
  sheetId,
  payload,
}: SheetProps<"share-cast-modal">) {
  const { castHash, whoIsSharing } = payload || {};

  const handleShareToTwitter = async () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=Check out this cast!&url=https://www.anky.bot/cast/${castHash}`;
    await Linking.openURL(twitterUrl);
    SheetManager.hide(sheetId);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(`https://anky.bot/cast/${castHash}`);
    // You might want to show a toast or alert here to confirm the link was copied
    SheetManager.hide(sheetId);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this cast! https://anky.bot/cast/${castHash}`,
      });
    } catch (error) {
      console.error(error);
    }
    SheetManager.hide(sheetId);
  };

  return (
    <ActionSheet
      id={sheetId}
      containerStyle={{
        backgroundColor: "transparent",
        position: "relative",
        shadowOpacity: 0,
        paddingBottom: "65%",
      }}
      gestureEnabled={true}
      indicatorStyle={{ backgroundColor: "transparent" }}
      elevation={0}
      overlayColor="#EEEEEEFF"
    >
      <View
        style={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "white",
          marginHorizontal: 20,
          borderWidth: 2,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "center",
            backgroundColor: "#4A90E2",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 2,
            borderBottomColor: "black",
            width: "100%",
            height: 40,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "white",
              marginTop: 4,
            }}
          >
            Share Cast
          </Text>

          <Pressable
            style={{
              marginLeft: "auto",
              marginVertical: "auto",
              borderRadius: 6,
              opacity: 0.5,
            }}
            onPress={() => SheetManager.hide(sheetId)}
          >
            <Text style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>
              X
            </Text>
          </Pressable>
        </View>

        <View style={{ width: "100%", flex: 1, gap: 16, padding: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              gap: 16,
            }}
          >
            <View
              style={{
                borderRadius: 9999,
                flex: 1,
                alignItems: "flex-start",
                gap: 2,
              }}
            >
              <Text
                style={{
                  color: "#FF6B00",
                  fontWeight: "600",
                  fontSize: 16,
                  lineHeight: 16,
                }}
              >
                Share this cast
              </Text>
              <Text
                style={{
                  color: "black",
                  fontWeight: "600",
                  fontSize: 16,
                  lineHeight: 16,
                }}
              >
                Choose an option below
              </Text>
            </View>
          </View>

          <Pressable
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#E0E0E0",
              paddingVertical: 12,
              borderRadius: 9999,
              borderWidth: 2,
            }}
            onPress={handleShareToTwitter}
          >
            <Text
              style={{
                color: "black",
                fontSize: 16,
                fontWeight: "bold",
                lineHeight: 16,
              }}
            >
              Share to Twitter
            </Text>
          </Pressable>

          <Pressable
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#4A90E2",
              paddingVertical: 12,
              borderRadius: 9999,
              borderWidth: 2,
            }}
            onPress={handleCopyLink}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "bold",
                lineHeight: 16,
              }}
            >
              Copy Link
            </Text>
          </Pressable>

          <Pressable
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#E0E0E0",
              paddingVertical: 12,
              borderRadius: 9999,
              borderWidth: 2,
            }}
            onPress={handleShare}
          >
            <Text
              style={{
                color: "black",
                fontSize: 16,
                fontWeight: "bold",
                lineHeight: 16,
              }}
            >
              Share...
            </Text>
          </Pressable>

          <Pressable
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#E0E0E0",
              paddingVertical: 12,
              borderRadius: 9999,
              borderWidth: 2,
            }}
            onPress={() => {
              SheetManager.hide(sheetId);
            }}
          >
            <Text
              style={{
                color: "black",
                fontSize: 16,
                fontWeight: "bold",
                lineHeight: 16,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </ActionSheet>
  );
}
