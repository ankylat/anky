import React, { useState } from "react";
import { TouchableOpacity, Image, View, ActivityIndicator } from "react-native";
import { Cast } from "@/src/types/Cast";

interface ProfileGridElementProps {
  cast: Cast;
  size: number;
  onPress: () => void;
}

const ProfileGridElement: React.FC<ProfileGridElementProps> = ({
  cast,
  size,
  onPress,
}) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <TouchableOpacity onPress={onPress} style={{ width: size, height: size }}>
      <View
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#e0e0e0",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {imageLoading && <ActivityIndicator size="large" color="#0000ff" />}
        <Image
          source={{
            uri:
              cast?.embeds[0]?.url ||
              "https://github.com/jpfraneto/images/blob/main/azteccc.jpeg?raw=true",
          }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
      </View>
    </TouchableOpacity>
  );
};

export default ProfileGridElement;
