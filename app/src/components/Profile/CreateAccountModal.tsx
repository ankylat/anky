import { useState, useRef, useEffect } from "react";
import {
  Pressable,
  View,
  Text,
  Modal,
  TextInput,
  Linking,
  Platform,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  usePrivy,
  useLoginWithEmail,
  useEmbeddedWallet,
  isConnected,
  needsRecovery,
} from "@privy-io/expo";
import { useSmartWallets } from "@privy-io/expo/smart-wallets";
import bigInt from "big-integer";

import axios from "axios";
import { prettyLog } from "@/src/app/lib/logs";
import { useUser } from "@/src/context/UserContext";

type Props = {
  isVisible: boolean;
  onClose: () => void;
};

export default function CreateAccountModal({ isVisible, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const { ankyUser } = useUser();
  const { client } = useSmartWallets();
  const wallet = useEmbeddedWallet();
  const { user, isReady } = usePrivy();
  const emailRef = useRef<TextInput>(null);

  const { sendCode, loginWithCode, state } = useLoginWithEmail({
    onSendCodeSuccess({ email }) {
      console.log("Code sent successfully to", email);
      handleNextPress(2);
    },
    onLoginSuccess(user, isNewUser) {
      console.log("Logged in successfully", { user, isNewUser });
      wallet.create({ recoveryMethod: "privy" });

      setLoggedIn(true);
      handleNextPress(3);
    },
    onError(error) {
      setError(error.message);
    },
  });

  const handleNextPress = (nextStep: number) => {
    setStep(nextStep);
  };

  const handleEmailSubmit = async () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        await sendCode({ email });
      } catch (err) {
        setError("Failed to send verification code");
      }
    } else {
      setError("Please enter a valid phone number");
    }
  };

  const handlePinSubmit = async () => {
    if (pinCode.length === 6) {
      try {
        console.log("IN HEREEEE", pinCode, email);
        await loginWithCode({
          code: pinCode,
          email,
        });
      } catch (err) {
        setError("Invalid verification code");
      }
    }
  };

  useEffect(() => {
    if (user) {
      console.log("The user is ", user);
      console.log("The wallet is ", wallet);
      prettyLog(wallet, "the wallet is");
      if (needsRecovery(wallet)) {
        console.log("THE WALLET NEEDS RECOVERY");
      }
      handleNextPress(3);
    }
  }, [isReady]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View className="space-y-6">
            <View className="flex-row items-center space-x-2">
              <TextInput
                className="flex-1 border-2 border-purple-400 rounded-2xl p-4 bg-purple-100/30 text-purple-900 text-center text-xl"
                placeholder="you@anky.bot"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <Pressable
                onPress={() => setEmail(email.slice(0, -1))}
                className="bg-purple-400 p-4 rounded-2xl active:bg-purple-500"
              >
                <Text className="text-white text-xl">⌫</Text>
              </Pressable>
            </View>
            {error && (
              <Text className="text-pink-500 text-center font-bold">
                {error}
              </Text>
            )}

            <View className="space-y-4">
              <Text className="text-center text-sm text-purple-800">
                By continuing, you agree to our{" "}
                <Text
                  className="text-purple-600 underline"
                  onPress={() => Linking.openURL("https://terms.anky.bot")}
                >
                  terms
                </Text>{" "}
                and{" "}
                <Text
                  className="text-purple-600 underline"
                  onPress={() => Linking.openURL("https://privacy.anky.bot")}
                >
                  privacy policy
                </Text>
              </Text>

              <Pressable
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 py-4 rounded-2xl active:scale-95 transform transition-all duration-200 shadow-xl"
                onPress={handleEmailSubmit}
                disabled={state.status === "sending-code"}
              >
                <Text className="text-center text-xl font-bold text-black">
                  {state.status === "sending-code"
                    ? "✨ Sending Magic Code..."
                    : "✨ Send Magic Code"}
                </Text>
              </Pressable>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="space-y-6">
            <Text className="text-center font-bold text-lg text-purple-800">
              Enter the magic code sent to:
            </Text>
            <Text className="text-center text-pink-600 font-bold text-xl">
              {email}
            </Text>
            <View className="flex-row items-center space-x-2">
              <TextInput
                className="flex-1 border-2 border-purple-400 rounded-2xl p-4 bg-purple-100/30 text-purple-900 text-center text-xl"
                placeholder="Enter 6-digit code"
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              {pinCode.length === 0 ? (
                <Pressable
                  onPress={async () => {
                    const text = await Clipboard.getStringAsync();
                    if (text.length === 6 && /^\d+$/.test(text)) {
                      setPinCode(text);
                    }
                  }}
                  className="bg-purple-400 p-4 rounded-2xl active:bg-purple-500"
                >
                  <Text className="text-white text-xl">📋</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setPinCode(pinCode.slice(0, -1))}
                  className="bg-purple-400 p-4 rounded-2xl active:bg-purple-500"
                >
                  <Text className="text-white text-xl">⌫</Text>
                </Pressable>
              )}
            </View>

            {pinCode.length == 6 && (
              <Pressable
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 py-4 rounded-2xl active:scale-95 transform transition-all duration-200 shadow-xl"
                onPress={handlePinSubmit}
              >
                <Text className="text-center text-xl font-bold text-black">
                  Verify Code
                </Text>
              </Pressable>
            )}

            {state.status === "submitting-code" && (
              <Text className="text-center text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
                ✨ Verifying your magic code...
              </Text>
            )}
          </View>
        );
      case 3:
        console.log("Rendering step 3");
        return (
          <View className="space-y-6">
            <View className="space-y-6">
              <Text className="text-center font-bold text-2xl text-purple-800">
                Create your Farcaster account
              </Text>
              <Pressable
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 py-4 rounded-2xl active:scale-95 transform transition-all duration-200 shadow-xl"
                onPress={async () => {
                  console.log("Create Farcaster account button pressed");
                  try {
                    if (user && client) {
                      const smartWallet = user.linked_accounts.find(
                        (account) => account.type === "smart_wallet"
                      );
                      console.log("Found smart wallet:", smartWallet);

                      if (!smartWallet?.address) {
                        throw new Error("Smart wallet not found");
                      }

                      const { data: payload } = await axios.post(
                        "https://farcaster.anky.bot/create-new-fid",
                        {
                          user_wallet_address: smartWallet?.address,
                        }
                      );

                      const signature = await client.signTypedData({
                        account: client.account,
                        domain: {
                          name: "Farcaster ID Registry",
                          version: "1",
                          chainId: 10, // Optimism
                          verifyingContract:
                            "0x00000000fc6c5f01fc30151999387bb99a9f489b",
                        },
                        types: {
                          Transfer: [
                            { name: "fid", type: "uint256" },
                            { name: "to", type: "address" },
                            { name: "nonce", type: "uint256" },
                            { name: "deadline", type: "uint256" },
                          ],
                        },
                        message: {
                          fid: bigInt(payload.new_fid),
                          to: smartWallet.address,
                          nonce: bigInt(payload.nonce),
                          deadline: bigInt(payload.deadline),
                        },
                      });

                      const res = await axios.post(
                        "https://farcaster.anky.bot/create-new-fid-signed-message",
                        {
                          deadline: Number(payload.deadline),
                          address: wallet.account?.address,
                          fid: payload.new_fid,
                          signature,
                          user_id: ankyUser?.id,
                        }
                      );

                      console.log("Registration successful:", res.data);
                      onClose();
                    }
                  } catch (error: any) {
                    console.error("Error creating Farcaster account:", error);
                    setError(
                      error.message || "Failed to create Farcaster account"
                    );
                  }
                }}
              >
                <Text className="text-center p-4 bg-purple-500 rounded-full text-4xl font-bold text-black">
                  CREATE ANKY
                </Text>
              </Pressable>

              {error && (
                <Text className="text-center text-red-500 font-bold">
                  {error}
                </Text>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };
  console.log("rendering the modal ", isVisible);
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      statusBarTranslucent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end bg-black/70"
        style={{
          zIndex: 3000, // Increased z-index
          elevation: Platform.OS === "android" ? 3000 : 0, // For Android
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="absolute bottom-0 w-full bg-white rounded-t-3xl border-t border-black p-6"
          style={{
            zIndex: 3001, // Increased z-index
            elevation: Platform.OS === "android" ? 3001 : 0,
            height: "75%", // Changed from h-2/3 for more precise control
          }}
        >
          <View className="flex-col space-y-6">{renderStep()}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
