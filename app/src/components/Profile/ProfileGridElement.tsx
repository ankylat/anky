import React, { useState } from "react";
import {
  TouchableOpacity,
  Image,
  Modal,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { Cast } from "@/src/types/Cast";
import CastElement from "@/src/components/Cast";

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
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openModal}
        style={{ width: size, height: size }}
      >
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 18,
              alignItems: "center",
              overflow: "scroll",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              width: "90%",
              maxHeight: "80%",
            }}
          >
            <CastElement cast={cast} isInModal={true} />
            <TouchableOpacity
              style={{ position: "absolute", top: 10, right: 10 }}
              onPress={closeModal}
            >
              <Text style={{ fontSize: 24 }}>&times;</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ProfileGridElement;
