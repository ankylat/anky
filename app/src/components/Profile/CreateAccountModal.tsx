import { useState, useRef, useEffect } from "react";
import {
  Pressable,
  View,
  Text,
  Modal,
  TextInput,
  Linking,
  Platform,
  Animated,
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
import bigInt from "big-integer";

import axios from "axios";
import { prettyLog } from "@/src/app/lib/logs";
import { useUser } from "@/src/context/UserContext";
import { createWalletClient, custom, createPublicClient, http } from "viem";
import { optimism } from "viem/chains";
import idRegistryAbi from "@/src/constants/abi/idRegistryAbi.json";
import ID_REGISTRY_EIP_712_TYPES from "@/src/constants/ID_REGISTRY_EIP_712_TYPES.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AnkyUser } from "@/src/types/User";
import { getAnkyUserLastWritingSession } from "@/src/app/lib/writingGame";
import { shareAnkyWritingSessionAsCast } from "@/src/api/farcaster";

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
  const [loadingFarcasterAccountCreation, setLoadingFarcasterAccountCreation] =
    useState(false);

  const { ankyUser } = useUser();
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
    setError("");
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        await sendCode({ email });
      } catch (err) {
        setError("Failed to send verification code");
      }
    } else {
      setError(
        "please enter a valid email. It doesn't need to be 'your' email"
      );
    }
  };

  const handlePinSubmit = async () => {
    setError("");
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
                  className="p-4 h-16 ml-2 flex rounded-2xl "
                >
                  <Text className="text-white text-6xl mt-auto">📋</Text>
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
              <Pressable
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 py-4 rounded-2xl active:scale-95 transform transition-all duration-200 shadow-xl"
                onPress={async () => {
                  setLoadingFarcasterAccountCreation(true);
                  console.log("Create Farcaster account button pressed");
                  try {
                    if (user) {
                      if (!wallet.account?.address) {
                        wallet.create({ recoveryMethod: "privy" });
                      }
                      prettyLog(wallet, "THE WALLET HERE IS");

                      const { data: payload } = await axios.post(
                        "https://farcaster.anky.bot/create-new-fid",
                        {
                          user_wallet_address: wallet.account?.address,
                        }
                      );
                      prettyLog(payload, "THE PAYLOAD IS");

                      const getDeadline = () => {
                        const now = Math.floor(Date.now() / 1000);
                        const oneHour = 60 * 60;
                        return now + oneHour;
                      };
                      const readNonce = async () => {
                        const res: any = await publicClient.readContract({
                          address: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
                          abi: idRegistryAbi,
                          functionName: "nonces",
                          args: [wallet.account?.address as `0x${string}`],
                        });
                        return res;
                      };

                      const publicClient = createPublicClient({
                        chain: optimism,
                        transport: http(),
                      });

                      let nonce = await readNonce();
                      const provider = await wallet.getProvider();
                      if (!provider) return;
                      const walletClient = createWalletClient({
                        chain: optimism,
                        transport: custom(provider),
                      });

                      const deadline = getDeadline();
                      if (nonce !== undefined) {
                        const message = {
                          fid: payload.new_fid,
                          to: wallet.account?.address as `0x${string}`,
                          nonce: nonce,
                          deadline: deadline,
                        };

                        const signature = await walletClient.signTypedData({
                          account: wallet.account?.address as `0x${string}`,
                          domain: {
                            name: "Farcaster IdRegistry",
                            version: "1",
                            chainId: 10,
                            verifyingContract:
                              "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b",
                          },
                          types: ID_REGISTRY_EIP_712_TYPES.types,
                          primaryType: "Transfer",
                          message,
                        });

                        const res = await axios.post(
                          "https://farcaster.anky.bot/create-new-fid-signed-message",
                          {
                            deadline: deadline,
                            address: wallet.account?.address,
                            fid: payload.new_fid,
                            signature,
                            user_id: ankyUser?.id,
                          }
                        );

                        const fetchedAnkyUser = (await AsyncStorage.getItem(
                          "ankyUser"
                        )) as unknown as AnkyUser;
                        if (fetchedAnkyUser) {
                          const ankyUserObj = {
                            ...fetchedAnkyUser,
                            farcaster_account: {
                              ...fetchedAnkyUser.farcaster_account,
                              signer_uuid: res.data.signer.signer_uuid,
                              fid: res.data.signer.fid,
                            },
                          };
                          await AsyncStorage.setItem(
                            "ankyUser",
                            JSON.stringify(ankyUserObj)
                          );
                        }
                        setLoadingFarcasterAccountCreation(false);
                        const lastSession =
                          await getAnkyUserLastWritingSession();
                        if (lastSession) {
                          shareAnkyWritingSessionAsCast(lastSession);
                        }
                        const responseFromPoiesis = await axios.post(
                          "https://poiesis.anky.bot/anky/finished-anky-registration",
                          {
                            user_id: ankyUser?.id,
                            signer_uuid: res.data.signer.signer_uuid,
                            fid: res.data.signer.fid,
                          }
                        );
                        prettyLog(responseFromPoiesis, "RESPONSE FROM POIESIS");
                        onClose();
                      }
                    }
                  } catch (error: any) {
                    console.error("Error invoking anky:", error);
                    setError(error.message || "Failed to invoke your Anky");
                  }
                }}
              >
                <Text className="text-center p-4 bg-purple-500 rounded-full  text-4xl font-bold text-black">
                  INVOKE YOUR ANKY
                </Text>
              </Pressable>

              {loadingFarcasterAccountCreation && <LoadingAccountCreation />}

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

export function LoadingAccountCreation() {
  const [lastSession, setLastSession] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [streamedSession, setStreamedSession] = useState("");
  const CHAR_DELAY = 33;

  useEffect(() => {
    const fetchLastSession = async () => {
      try {
        const writingSessionsArray = await AsyncStorage.getItem(
          "writing_sessions_array"
        );
        if (writingSessionsArray) {
          const sessions = JSON.parse(writingSessionsArray);
          if (sessions.length > 0) {
            const lastSessionId = sessions[sessions.length - 1];
            const sessionContent = await AsyncStorage.getItem(
              `writing_session_${lastSessionId}`
            );
            if (sessionContent) {
              setLastSession(sessionContent);
              streamText(sessionContent.slice(0, 100));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching last writing session:", error);
      }
    };

    fetchLastSession();
  }, []);

  const streamText = (text: string) => {
    let currentIndex = 0;
    const loadingText = "✨ Creating your Farcaster account...";

    // Stream the loading text
    const loadingInterval = setInterval(() => {
      if (currentIndex < loadingText.length) {
        setStreamedText(loadingText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(loadingInterval);

        // After loading text completes, stream the session text if it exists
        if (text) {
          let sessionIndex = 0;
          const sessionInterval = setInterval(() => {
            if (sessionIndex < text.length) {
              setStreamedSession(text.slice(0, sessionIndex + 1));
              sessionIndex++;
            } else {
              clearInterval(sessionInterval);
            }
          }, CHAR_DELAY);
        }
      }
    }, CHAR_DELAY);

    return () => {
      clearInterval(loadingInterval);
    };
  };

  return (
    <View>
      <Text className="text-center text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
        {streamedText.split("").map((letter, index) => (
          <Animated.Text key={index}>{letter}</Animated.Text>
        ))}
      </Text>
      {lastSession && streamedSession && (
        <Text className="text-center text-sm italic text-gray-400 mt-2">
          "{streamedSession}..."
        </Text>
      )}
    </View>
  );
}
