import {
  View,
  Text,
  Pressable,
  Button,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React, { useEffect } from "react";
import { useTextStream } from "@/src/hooks/useTextStream";
import * as Updates from "expo-updates";
import { useLoginWithSMS, usePrivy, useEmbeddedWallet } from "@privy-io/expo";
import { useNavigation } from "expo-router";
import { CommonActions } from "@react-navigation/native";
import { postNewUser } from "@/src/api/auth";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const { displayedText, streamEnded } = useTextStream("hello, human");
  const [step, setStep] = React.useState(1);
  const navigation = useNavigation();

  const [optionsSoFar, setOptionsSoFar] = React.useState<string[]>([]);
  const [phone, setPhone] = React.useState("");
  const [pinCode, setPinCode] = React.useState("");
  const { user, isReady, logout } = usePrivy();
  const wallet = useEmbeddedWallet();
  const { sendCode, loginWithCode, state } = useLoginWithSMS({
    onSendCodeSuccess({ phone }) {
      console.log("THe user is logging in");
    },
    onLoginSuccess(user, isNewUser) {
      // show a toast, send analytics event, etc...
      console.log("The user is logged in", user, isNewUser);

      wallet.create({ recoveryMethod: "privy" });
      console.log("=======CREATING NEW USER========");
      console.log("=======CREATING NEW USER========");
      console.log("=======CREATING NEW USER========");
      const {
        data: newUser,
        isLoading,
        error,
      } = useQuery({
        queryKey: ["postNewUser"],
        queryFn: () => postNewUser(user),
      });
      console.log("=======CREATED NEW USER========");
      console.log("=======CREATED NEW USER========");
      console.log(newUser);
      console.log("=======CREATED NEW USER========");
      console.log("=======CREATED NEW USER========");
    },
  });
  const handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.log("Error reloading app:", error);
    }
  };

  const chooseOption = (option: string) => {
    console.log(option);
    setStep((prev) => Math.min(prev + 1));
    setOptionsSoFar((prev) => [...prev, option]);
  };

  const nextStep = () => {
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    if (isReady && user) {
      navigation.dispatch(
        CommonActions.reset({
          routes: [{ key: "(tabs)", name: "(tabs)" }],
        })
      );
    }
  }, [user, isReady]);

  if (!isReady) {
    return <View className="flex-1 items-center justify-center"></View>;
  }

  return (
    <View className="flex-1 items-center justify-center">
      {step === 0 && isReady && user && (
        <View className="flex-1 items-center justify-center bg-black w-full">
          <Text className="text-3xl font-bold text-white mb-4 animate-bounce">
            You are already logged in
          </Text>
          <Text className="text-lg text-white mb-6 opacity-80">
            Your wallet is{" "}
            {user.linked_accounts.find((acc) => acc.type === "wallet")?.address}
          </Text>
          <Pressable
            onPress={() => {
              logout();
              setStep(1);
            }}
            className="bg-white/20 px-6 py-3 rounded-full border-2 border-white/50 active:scale-95 transition-transform"
          >
            <Text className="text-white font-semibold text-lg">logout</Text>
          </Pressable>
        </View>
      )}

      {step === 1 && (
        <ScreenOne
          setStep={setStep}
          chooseOption={chooseOption}
          optionsSoFar={optionsSoFar}
          setOptionsSoFar={setOptionsSoFar}
        />
      )}

      {step === 2 && (
        <ScreenTwo
          setStep={setStep}
          chooseOption={chooseOption}
          optionsSoFar={optionsSoFar}
          setOptionsSoFar={setOptionsSoFar}
          phone={phone}
          setPhone={setPhone}
          sendCode={sendCode}
        />
      )}

      {step === 3 && (
        <ScreenThree
          setStep={setStep}
          chooseOption={chooseOption}
          optionsSoFar={optionsSoFar}
          setOptionsSoFar={setOptionsSoFar}
          phone={phone}
          pinCode={pinCode}
          setPinCode={setPinCode}
          loginWithCode={loginWithCode}
          state={state}
        />
      )}

      {step === 4 && (
        <ScreenFour
          setStep={setStep}
          chooseOption={chooseOption}
          optionsSoFar={optionsSoFar}
          setOptionsSoFar={setOptionsSoFar}
          phone={phone}
          pinCode={pinCode}
          setPinCode={setPinCode}
          loginWithCode={loginWithCode}
          state={state}
        />
      )}

      <Pressable
        onPress={handleReload}
        className="absolute bottom-8 bg-blue-500 text-white px-6 py-3 rounded-full text-lg"
      >
        <Text>Reload</Text>
      </Pressable>
    </View>
  );
};

export default Index;

const ScreenOne = ({
  setStep,
  chooseOption,
  optionsSoFar,
  setOptionsSoFar,
}: {
  setStep: (step: number) => void;
  chooseOption: (option: string) => void;
  optionsSoFar: string[];
  setOptionsSoFar: (options: string[]) => void;
}) => {
  const { displayedText, streamEnded } = useTextStream("hello, human");
  return (
    <View className="flex-1 items-center justify-center w-full">
      <Text className="text-2xl font-bold">{displayedText}</Text>
      {streamEnded && (
        <View className="flex-row gap-4 mt-8 px-4 w-full justify-center bg-red-200">
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-2xl shadow-md active:opacity-80"
            onPress={() => {
              chooseOption("hello");
            }}
          >
            <Text className="text-white font-medium text-base">hello</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-purple-500 px-6 py-3 rounded-2xl shadow-md active:opacity-80"
            onPress={() => {
              chooseOption("who are you?");
            }}
          >
            <Text className="text-white font-medium text-base">
              who are you?
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-teal-500 px-6 py-3 rounded-2xl shadow-md active:opacity-80"
            onPress={() => {
              chooseOption("what is this?");
            }}
          >
            <Text className="text-white font-medium text-base">
              what is this?
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

type OtpFlowState =
  | { status: "initial" }
  | { status: "error"; error: Error | null }
  | { status: "sending-code" }
  | { status: "awaiting-code-input" }
  | { status: "submitting-code" }
  | { status: "done" };

const ScreenTwo = ({
  setStep,
  chooseOption,
  optionsSoFar,
  setOptionsSoFar,
  phone,
  setPhone,
  sendCode,
}: {
  setStep: (step: number) => void;
  chooseOption: (option: string) => void;
  optionsSoFar: string[];
  setOptionsSoFar: (options: string[]) => void;
  phone: string;
  setPhone: (phone: string) => void;
  sendCode: (args: { phone: string }) => Promise<any>;
}) => {
  const { displayedText, streamEnded } = useTextStream(
    "i need an email address to identify you",
    44
  );
  return (
    <View className="flex-1 items-center justify-center w-full">
      <Text className="text-2xl font-bold">{displayedText}</Text>
      {streamEnded && (
        <View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="56985491126"
            inputMode="tel"
            className="mt-8 text-4xl font-bold"
          />
          {phone.length > 8 && (
            <Button
              title="Send Code"
              onPress={() => {
                console.log("Sending code", phone);
                setStep(3);
                sendCode({ phone: `+${phone}` });
              }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const ScreenThree = ({
  setStep,
  chooseOption,
  optionsSoFar,
  setOptionsSoFar,
  phone,
  pinCode,
  setPinCode,
  loginWithCode,
  state,
}: {
  setStep: (step: number) => void;
  chooseOption: (option: string) => void;
  optionsSoFar: string[];
  setOptionsSoFar: (options: string[]) => void;
  phone: string;
  pinCode: string;
  setPinCode: (pinCode: string) => void;
  loginWithCode: (args: { code: string; phone: string }) => Promise<any>;
  state: OtpFlowState;
}) => {
  const { displayedText: firstDisplayedText, streamEnded: firstStreamEnded } =
    useTextStream("connecting with the internet...");
  const { displayedText, streamEnded } = useTextStream(
    "enter the 6 digit code you received over SMS",
    44
  );
  console.log("The strate is ", state, phone);

  return (
    <View className="flex-1 items-center justify-center w-full">
      {(state.status === "awaiting-code-input" ||
        state.status === "sending-code") &&
        displayedText.length > 0 && (
          <Text className="text-2xl font-bold">{firstDisplayedText}</Text>
        )}
      {state.status === "awaiting-code-input" && (
        <Text className="text-2xl font-bold">{displayedText}</Text>
      )}
      {streamEnded && (
        <View className="">
          <TextInput
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="783928"
            inputMode="tel"
            className="mt-8 text-4xl font-bold"
          />
          {pinCode.length === 6 && (
            <Button
              title="Submit"
              onPress={() => {
                setStep(4);
                loginWithCode({ code: pinCode, phone: `+${phone}` });
              }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const ScreenFour = ({
  setStep,
  chooseOption,
  optionsSoFar,
  setOptionsSoFar,
  phone,
  pinCode,
  setPinCode,
  loginWithCode,
  state,
}: {
  setStep: (step: number) => void;
  chooseOption: (option: string) => void;
  optionsSoFar: string[];
  setOptionsSoFar: (options: string[]) => void;
  phone: string;
  pinCode: string;
  setPinCode: (pinCode: string) => void;
  loginWithCode: (args: { code: string; phone: string }) => Promise<any>;
  state: OtpFlowState;
}) => {
  const { displayedText: firstDisplayedText, streamEnded: firstStreamEnded } =
    useTextStream("connecting with the internet...");
  const { displayedText, streamEnded } = useTextStream(
    "enter the 6 digit code you received over SMS",
    44
  );
  console.log("The strate is ", state);

  return (
    <View className="flex-1 items-center justify-center w-full">
      {(state.status === "awaiting-code-input" ||
        state.status === "sending-code") &&
        displayedText.length > 0 && (
          <Text className="text-2xl font-bold">{firstDisplayedText}</Text>
        )}
      {firstStreamEnded && state.status === "awaiting-code-input" && (
        <Text className="text-2xl font-bold">{displayedText}</Text>
      )}
      {streamEnded && (
        <View className="">
          <TextInput
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="783928"
            inputMode="tel"
            className="mt-8 text-4xl font-bold"
          />
          {pinCode.length === 6 && (
            <Button
              title="Submit"
              onPress={() => {
                setStep(4);
                console.log("Submitting code", pinCode, phone);
                loginWithCode({ code: pinCode, phone: `+${phone}` });
              }}
            />
          )}
        </View>
      )}
    </View>
  );
};
