import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
  TextInput,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AetherCoin from "@/assets/icons/aether.svg";
import LuminaCoin from "@/assets/icons/lumina.svg";
import TerraCoin from "@/assets/icons/terra.svg";
import { Link, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WritingSession } from "@/src/types/Anky";
import {
  usePrivy,
  useEmbeddedWallet,
  isNotCreated,
  useLoginWithFarcaster,
} from "@privy-io/expo";

import { NavigationProp } from "@react-navigation/native";
import { useAnky } from "@/src/context/AnkyContext";

// Add interface for route params
interface RootStackParamList {
  writing: { prompt: string };
}

const NotLoggedInUserView = ({
  setShowWritingGame,
}: {
  setShowWritingGame: (show: boolean) => void;
}) => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [error, setError] = useState("");

  const {
    isWritingGameVisible,
    setIsWritingGameVisible,
    writingGameProps,
    setWritingGameProps,
  } = useAnky();

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const { user, isReady, logout } = usePrivy();
  console.log("the user is", user);
  console.log("the isReady is", isReady);

  const emailRef = useRef<TextInput>(null);
  const [viewMode, setViewMode] = useState<"ankys" | "drafts" | "collected">(
    "ankys"
  );
  const screenWidth = Dimensions.get("window").width;

  const wallet = useEmbeddedWallet();
  console.log("the users WALLET IS;", wallet);

  const { loginWithFarcaster, state } = useLoginWithFarcaster({
    onSuccess(user, isNewUser) {
      wallet.create({ recoveryMethod: "privy" });
    },
    onError(error) {
      console.log("there was an error loggin in the user", error);
    },
  });

  const handleNextPress = (nextStep: number) => {
    console.log(`Moving to step ${nextStep}`);
    setStep(nextStep);
  };

  const submitEmailToGetPinCode = () => {
    console.log("submitEmailToGetPinCode", emailRef.current);
  };

  return (
    <View className="flex-1 bg-white text-black pt-10 w-full h-full items-center justify-center">
      <View className="w-2/3 gap-4">
        <Pressable
          onPress={() => {
            setWritingGameProps({
              targetDuration: 180,
              directions: {
                center: {
                  direction: "center",
                  prompt: "tell us who you are",
                  color: "#FFFFFF",
                  textColor: "#000000",
                },
                left: {
                  direction: "center",
                  prompt: "tell us who you are",
                  color: "#FFFFFF",
                  textColor: "#000000",
                },
                right: {
                  direction: "center",
                  prompt: "tell us who you are",
                  color: "#FFFFFF",
                  textColor: "#000000",
                },
                up: {
                  direction: "center",
                  prompt: "tell us who you are",
                  color: "#FFFFFF",
                  textColor: "#000000",
                },
                down: {
                  direction: "center",
                  prompt: "tell us who you are",
                  color: "#FFFFFF",
                  textColor: "#000000",
                },
              },
            });
            setIsWritingGameVisible(true);
          }}
          className="bg-red-500   p-2 rounded-md border-purple-500"
        >
          <Text className="text-4xl">Open modal</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default NotLoggedInUserView;
