import React from "react";
import {
  TouchableOpacity,
  ImageBackground,
  Text,
  View,
  Image,
} from "react-native";
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
  return (
    <TouchableOpacity onPress={onPress} style={{ width: size, height: size }}>
      <Image
        source={{
          uri:
            cast?.embeds[0]?.url ||
            "https://github.com/jpfraneto/images/blob/main/azteccc.jpeg?raw=true",
        }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
};

export default ProfileGridElement;
