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
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WritingSession } from "@/src/types/Anky";
import {
  usePrivy,
  useEmbeddedWallet,
  isNotCreated,
  useLoginWithFarcaster,
} from "@privy-io/expo";

const NotLoggedInUserView = () => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [error, setError] = useState("");

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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View className="flex-1 bg-white pt-10 w-full h-full mt-auto  justify-center px-6">
            <TextInput
              className="border-2 border-gray-300 rounded-lg p-3 mb-2"
              placeholder="ramana@awakentheworld.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              inputMode="email"
            />
            {error && <Text className="text-red-500 mb-4">{error}</Text>}
            <Pressable
              className="bg-blue-500 px-8 py-3 rounded-full shadow-lg"
              onPress={() => {
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  sendCode({ email });
                  handleNextPress(2);
                } else {
                  setError("Please enter a valid email address");
                  setEmail(email); // Trigger re-render to show error message
                }
              }}
            >
              <Text className="text-white font-bold text-lg text-center">
                Send Code
              </Text>
            </Pressable>
          </View>
        );

      case 2:
        return (
          <View className="flex-1 bg-white pt-10 w-full h-full mt-auto justify-center px-6">
            <View className="w-full mx-auto rounded-3xl bg-white border-2 border-black shadow-lg">
              <View className="flex flex-col items-center justify-center gap-4 p-4">
                <View className="flex flex-row items-start justify-center gap-4 w-full">
                  <View className="flex flex-col items-start justify-center gap-2.5 flex-1">
                    <Text className="text-sm font-semibold text-black">
                      Check your email for the verification code
                    </Text>
                    <Text className="text-sm font-bold text-blue-600">
                      {email}
                    </Text>
                  </View>
                </View>

                <View className="w-full flex flex-row justify-center mb-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View
                      key={index}
                      className={`w-4 h-4 mx-1 rounded-full ${
                        pinCode.length > index ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </View>

                <View className="w-full flex flex-row flex-wrap justify-center">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <TouchableOpacity
                      key={index + 1}
                      className="w-16 h-16 m-2 rounded-full bg-blue-500 flex items-center justify-center"
                      onPress={() => {
                        if (pinCode.length < 6) {
                          setPinCode(pinCode + (index + 1).toString());
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                          if (pinCode.length === 5) {
                            loginWithCode({
                              code: pinCode + (index + 1).toString(),
                              email,
                            })
                              .then((loginWithCodeResponse) => {
                                console.log(
                                  "the login with code response is ",
                                  loginWithCodeResponse
                                );
                                handleNextPress(3);
                              })
                              .catch((error) => {
                                console.log(
                                  "There was an error logging in",
                                  error
                                );
                                setPinCode("");
                              });
                          }
                        }
                      }}
                    >
                      <Text className="text-white font-bold text-lg">
                        {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <View className="w-16 h-16 m-2"></View>
                  <TouchableOpacity
                    key={0}
                    className="w-16 h-16 m-2 rounded-full bg-blue-500 flex items-center justify-center"
                    onPress={() => {
                      if (pinCode.length < 6) {
                        setPinCode(pinCode + "0");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (pinCode.length === 5) {
                          loginWithCode({
                            code: pinCode + "0",
                            email,
                          })
                            .then((loginWithCodeResponse) => {
                              console.log(
                                "the login with code response is ",
                                loginWithCodeResponse
                              );
                              handleNextPress(3);
                            })
                            .catch((error) => {
                              console.log(
                                "There was an error logging in",
                                error
                              );
                              setPinCode("");
                            });
                        }
                      }
                    }}
                  >
                    <Text className="text-white font-bold text-lg">0</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex flex-row w-full justify-between mt-4">
                  <TouchableOpacity
                    className="p-2 rounded-full border-2 bg-gray-200 shadow"
                    onPress={() => handleNextPress(1)}
                  >
                    <Ionicons name="arrow-back" size={24} color="black" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="p-2 rounded-full border-2 bg-gray-200 shadow"
                    onPress={() => setPinCode(pinCode.slice(0, -1))}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={24}
                      color="black"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="flex-1 bg-white pt-10 w-full h-full mt-auto  justify-center px-6">
            <Text>Welcome to Anky!</Text>
            {isNotCreated(wallet) && (
              <View>
                <Text>You can now create a special bag for you here</Text>
                <TouchableOpacity
                  className="p-2 rounded-full border-2 bg-gray-200 shadow"
                  onPress={async () => {
                    console.log("the user is", user);
                    const walletCreationResponse = await wallet.create({
                      recoveryMethod: "privy",
                    });
                    console.log(
                      "the wallet creation response is",
                      walletCreationResponse
                    );
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };
};

export default NotLoggedInUserView;
