import { useState, useRef } from "react";
import { Pressable, View, Text, Modal, TextInput } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  usePrivy,
  useEmbeddedWallet,
  isNotCreated,
  useLoginWithFarcaster,
  useLoginWithEmail,
  hasError,
} from "@privy-io/expo";

type Props = {
  isVisible: boolean;
  onClose: () => void;
};

export default function CreateAccountModal({ isVisible, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [error, setError] = useState("");

  const { user, isReady } = usePrivy();
  const wallet = useEmbeddedWallet();
  const emailRef = useRef<TextInput>(null);

  const { loginWithFarcaster } = useLoginWithFarcaster({
    onSuccess(user, isNewUser) {
      wallet.create({ recoveryMethod: "privy" });
    },
    onError(error) {
      console.log("there was an error logging in the user", error);
    },
  });

  const { sendCode, loginWithCode, state } = useLoginWithEmail({
    onSendCodeSuccess({ email }) {
      console.log("Code sent successfully to", email);
      handleNextPress(2);
    },
    onLoginSuccess(user, isNewUser) {
      console.log("Logged in successfully", { user, isNewUser });
      wallet.create({ recoveryMethod: "privy" });
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
      setError("Please enter a valid email address");
    }
  };

  const handlePinSubmit = async () => {
    if (pinCode.length === 6) {
      try {
        await loginWithCode({ code: pinCode, email });
      } catch (err) {
        setError("Invalid verification code");
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View className="space-y-4">
            <Pressable
              className="bg-blue-500 py-4 rounded-xl active:opacity-80"
              onPress={async () => {
                try {
                  await loginWithFarcaster({
                    relyingParty: "https://www.anky.bot",
                  });
                } catch (error) {
                  console.log("Error logging in with farcaster", error);
                }
              }}
            >
              <Text className="text-center text-lg font-semibold text-white">
                Login with Warpcast
              </Text>
            </Pressable>

            <Text className="text-center">- or -</Text>

            <Pressable
              className="bg-purple-500 py-4 rounded-xl active:opacity-80"
              onPress={() => handleNextPress(1)}
            >
              <Text className="text-center text-lg font-semibold text-white">
                Continue with Email
              </Text>
            </Pressable>
          </View>
        );

      case 1:
        return (
          <View className="space-y-4">
            <TextInput
              ref={emailRef}
              className="border-2 border-gray-300 rounded-lg p-3"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              inputMode="email"
              editable={state.status !== "sending-code"}
            />
            {error && <Text className="text-red-500">{error}</Text>}

            <Pressable
              className="bg-blue-500 py-4 rounded-xl active:opacity-80"
              onPress={handleEmailSubmit}
              disabled={state.status === "sending-code"}
            >
              <Text className="text-center text-lg font-semibold text-white">
                {state.status === "sending-code"
                  ? "Sending Code..."
                  : "Send Code"}
              </Text>
            </Pressable>
          </View>
        );

      case 2:
        return (
          <View className="space-y-4">
            <Text className="text-center font-semibold">
              Enter the verification code sent to:
            </Text>
            <Text className="text-center text-blue-600 font-bold">{email}</Text>

            <View className="flex-row justify-center mb-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <View
                  key={index}
                  className={`w-4 h-4 mx-1 rounded-full ${
                    pinCode.length > index ? "bg-blue-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </View>

            <View className="flex-row flex-wrap justify-center">
              {[...Array(9)].map((_, i) => (
                <Pressable
                  key={i + 1}
                  className="w-12 h-12 m-1 rounded-full bg-blue-500 items-center justify-center"
                  onPress={() => {
                    if (pinCode.length < 6) {
                      const newPin = pinCode + (i + 1);
                      setPinCode(newPin);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (newPin.length === 6) {
                        handlePinSubmit();
                      }
                    }
                  }}
                  disabled={state.status === "submitting-code"}
                >
                  <Text className="text-white font-bold">{i + 1}</Text>
                </Pressable>
              ))}
              <Pressable
                className="w-12 h-12 m-1 rounded-full bg-blue-500 items-center justify-center"
                onPress={() => {
                  if (pinCode.length < 6) {
                    const newPin = pinCode + "0";
                    setPinCode(newPin);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (newPin.length === 6) {
                      handlePinSubmit();
                    }
                  }
                }}
                disabled={state.status === "submitting-code"}
              >
                <Text className="text-white font-bold">0</Text>
              </Pressable>
              <Pressable
                className="w-12 h-12 m-1 rounded-full bg-gray-200 items-center justify-center"
                onPress={() => setPinCode(pinCode.slice(0, -1))}
                disabled={state.status === "submitting-code"}
              >
                <Ionicons name="backspace-outline" size={24} color="black" />
              </Pressable>
            </View>

            {state.status === "submitting-code" && (
              <Text className="text-center text-blue-500">
                Verifying code...
              </Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/70">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl border-t border-black p-6 h-2/3"
        >
          <View className="flex-col space-y-6">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold">Welcome to Anky</Text>
              <Pressable onPress={onClose} className="p-2">
                <MaterialIcons name="close" color="#000" size={22} />
              </Pressable>
            </View>

            {renderStep()}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
