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

  //   const renderStep = () => {
  //     switch (step) {
  //       case 0:
  //         return (
  //           <View className="flex-1 bg-white pt-10 w-full h-full">
  //             <View className="items-center p-5">
  //               <View className="flex flex-row justify-between w-full">
  //                 <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
  //                   @ <Text className="blur-2xl">**************</Text>
  //                 </Text>
  //                 <View className="flex flex-row gap-4">
  //                   <TouchableOpacity
  //                     onPress={() => alert("Settings")}
  //                     disabled
  //                     className="bg-blue-200 rounded-full p-2"
  //                   >
  //                     <Ionicons name="settings-outline" size={24} color="white" />
  //                   </TouchableOpacity>
  //                   <TouchableOpacity
  //                     disabled
  //                     className="bg-blue-200 rounded-full p-2"
  //                   >
  //                     <Ionicons name="share-outline" size={24} color="white" />
  //                   </TouchableOpacity>
  //                 </View>
  //               </View>

  //               <View className="flex flex-row justify-between w-full items-center">
  //                 <View className="relative">
  //                   <Image
  //                     source={require("@/assets/images/anky.png")}
  //                     className="w-24 h-24 rounded-full mb-2.5"
  //                   />
  //                   <TouchableOpacity
  //                     onPress={() => alert("Edit")}
  //                     disabled
  //                     className="absolute bottom-0 right-0"
  //                   >
  //                     <Text className="text-3xl">👽</Text>
  //                   </TouchableOpacity>
  //                 </View>

  //                 <View className="flex flex-row gap-4 flex-1 px-16 justify-between">
  //                   <View className="items-center">
  //                     <Text className="text-2xl font-bold">0</Text>
  //                     <Text className="text-sm text-gray-600">ankys</Text>
  //                   </View>
  //                   <View className="items-center">
  //                     <Text className="text-2xl font-bold">?</Text>
  //                     <Text className="text-sm text-gray-600">followers</Text>
  //                   </View>
  //                   <View className="items-center">
  //                     <Text className="text-2xl font-bold">?</Text>
  //                     <Text className="text-sm text-gray-600">following</Text>
  //                   </View>
  //                 </View>
  //               </View>

  //               <TouchableOpacity className="w-fit border-2 border-yellow-400 rounded-lg p-4  my-4">
  //                 <View className="flex-row justify-between w-full gap-2">
  //                   <View className="flex-row items-center">
  //                     <AetherCoin width={40} height={40} />
  //                     <Text className="ml-2 text-lg">0</Text>
  //                   </View>
  //                   <View className="flex-row items-center">
  //                     <LuminaCoin width={40} height={40} />
  //                     <Text className="ml-2 text-lg">0</Text>
  //                   </View>
  //                   <View className="flex-row items-center">
  //                     <TerraCoin width={40} height={40} />
  //                     <Text className="ml-2 text-lg">0</Text>
  //                   </View>
  //                 </View>
  //                 <View className="flex-row justify-between items-center mt-2">
  //                   <Text className="ml-auto text-sm text-gray-600">
  //                     Balance: 0 $newen
  //                   </Text>
  //                 </View>
  //               </TouchableOpacity>

  //               <Text className="text-left w-full font-bold mb-1">
  //                 Charmichael Elements
  //               </Text>
  //               <Text className="text-lg mb-1 w-full text-left">
  //                 Here goes your bio.
  //               </Text>

  //               <View className="flex-row mt-2 ">
  //                 <TouchableOpacity
  //                   className={`border-b-2 ${
  //                     viewMode === "ankys"
  //                       ? "border-gray-300"
  //                       : "border-transparent"
  //                   } px-4 py-2 mr-4`}
  //                   onPress={() => setViewMode("ankys")}
  //                 >
  //                   <Text
  //                     className={`${
  //                       viewMode === "ankys"
  //                         ? "text-gray-700 font-medium"
  //                         : "text-gray-500"
  //                     }`}
  //                   >
  //                     Ankys
  //                   </Text>
  //                 </TouchableOpacity>
  //                 <TouchableOpacity
  //                   className={`border-b-2 ${
  //                     viewMode === "drafts"
  //                       ? "border-gray-300"
  //                       : "border-transparent"
  //                   } px-4 py-2 mr-4`}
  //                   onPress={() => setViewMode("drafts")}
  //                 >
  //                   <Text
  //                     className={`${
  //                       viewMode === "drafts"
  //                         ? "text-gray-700 font-medium"
  //                         : "text-gray-500"
  //                     }`}
  //                   >
  //                     Drafts
  //                   </Text>
  //                 </TouchableOpacity>
  //                 <TouchableOpacity
  //                   className={`border-b-2 ${
  //                     viewMode === "collected"
  //                       ? "border-gray-300"
  //                       : "border-transparent"
  //                   } px-4 py-2`}
  //                   onPress={() => setViewMode("collected")}
  //                 >
  //                   <Text
  //                     className={`${
  //                       viewMode === "collected"
  //                         ? "text-gray-700 font-medium"
  //                         : "text-gray-500"
  //                     }`}
  //                   >
  //                     Collected
  //                   </Text>
  //                 </TouchableOpacity>
  //               </View>
  //             </View>
  //             {viewMode === "ankys" && (
  //               <View className="p-4">
  //                 <Text>
  //                   Your completed 8 minute writing sessions represent "an Anky".
  //                 </Text>
  //               </View>
  //             )}
  //             {viewMode === "drafts" && (
  //               <View className="p-4">
  //                 <Text className="mb-2">
  //                   Every unfinished writing session will be stored here.
  //                 </Text>
  //               </View>
  //             )}
  //             {viewMode === "collected" && (
  //               <View className="p-4">
  //                 <Text className="mb-2">
  //                   Any time that you find a piece of writing that you resonate
  //                   with (or an Anky image that you love!) you can collect it with
  //                   the 💎 icon on the feed.
  //                 </Text>
  //                 <Text className="mt-2">
  //                   For doing so you will need $newen, in the form of Aether,
  //                   Lumina or Terra.
  //                 </Text>
  //               </View>
  //             )}
  //             <View className="flex-1 absolute bottom-16 left-0 right-0 items-center justify-center ">
  //               <Pressable
  //                 className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 px-8 py-4 rounded-full shadow-lg"
  //                 onPress={async () => {
  //                   try {
  //                     const response = await loginWithFarcaster({
  //                       relyingParty: "https://www.anky.bot",
  //                     });
  //                     console.log("the response is", response);
  //                   } catch (error) {
  //                     console.log(
  //                       "there was an error logging in with farcaster",
  //                       error
  //                     );
  //                   }
  //                 }}
  //               >
  //                 <Text className="text-white font-bold text-4xl">
  //                   login with warpcast
  //                 </Text>
  //               </Pressable>
  //             </View>
  //           </View>
  //         );

  //       case 1:
  //         return (
  //           <View className="flex-1 bg-white pt-10 w-full h-full mt-auto  justify-center px-6">
  //             <TextInput
  //               className="border-2 border-gray-300 rounded-lg p-3 mb-2"
  //               placeholder="ramana@awakentheworld.com"
  //               keyboardType="email-address"
  //               autoCapitalize="none"
  //               value={email}
  //               onChangeText={setEmail}
  //               inputMode="email"
  //             />
  //             {error && <Text className="text-red-500 mb-4">{error}</Text>}
  //             <Pressable
  //               className="bg-blue-500 px-8 py-3 rounded-full shadow-lg"
  //               onPress={() => {
  //                 if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  //                   sendCode({ email });
  //                   handleNextPress(2);
  //                 } else {
  //                   setError("Please enter a valid email address");
  //                   setEmail(email); // Trigger re-render to show error message
  //                 }
  //               }}
  //             >
  //               <Text className="text-white font-bold text-lg text-center">
  //                 Send Code
  //               </Text>
  //             </Pressable>
  //           </View>
  //         );

  //       case 2:
  //         return (
  //           <View className="flex-1 bg-white pt-10 w-full h-full mt-auto justify-center px-6">
  //             <View className="w-full mx-auto rounded-3xl bg-white border-2 border-black shadow-lg">
  //               <View className="flex flex-col items-center justify-center gap-4 p-4">
  //                 <View className="flex flex-row items-start justify-center gap-4 w-full">
  //                   <View className="flex flex-col items-start justify-center gap-2.5 flex-1">
  //                     <Text className="text-sm font-semibold text-black">
  //                       Check your email for the verification code
  //                     </Text>
  //                     <Text className="text-sm font-bold text-blue-600">
  //                       {email}
  //                     </Text>
  //                   </View>
  //                 </View>

  //                 <View className="w-full flex flex-row justify-center mb-4">
  //                   {Array.from({ length: 6 }).map((_, index) => (
  //                     <View
  //                       key={index}
  //                       className={`w-4 h-4 mx-1 rounded-full ${
  //                         pinCode.length > index ? "bg-blue-500" : "bg-gray-300"
  //                       }`}
  //                     />
  //                   ))}
  //                 </View>

  //                 <View className="w-full flex flex-row flex-wrap justify-center">
  //                   {Array.from({ length: 9 }).map((_, index) => (
  //                     <TouchableOpacity
  //                       key={index + 1}
  //                       className="w-16 h-16 m-2 rounded-full bg-blue-500 flex items-center justify-center"
  //                       onPress={() => {
  //                         if (pinCode.length < 6) {
  //                           setPinCode(pinCode + (index + 1).toString());
  //                           Haptics.impactAsync(
  //                             Haptics.ImpactFeedbackStyle.Medium
  //                           );
  //                           if (pinCode.length === 5) {
  //                             loginWithCode({
  //                               code: pinCode + (index + 1).toString(),
  //                               email,
  //                             })
  //                               .then((loginWithCodeResponse) => {
  //                                 console.log(
  //                                   "the login with code response is ",
  //                                   loginWithCodeResponse
  //                                 );
  //                                 handleNextPress(3);
  //                               })
  //                               .catch((error) => {
  //                                 console.log(
  //                                   "There was an error logging in",
  //                                   error
  //                                 );
  //                                 setPinCode("");
  //                               });
  //                           }
  //                         }
  //                       }}
  //                     >
  //                       <Text className="text-white font-bold text-lg">
  //                         {index + 1}
  //                       </Text>
  //                     </TouchableOpacity>
  //                   ))}
  //                   <View className="w-16 h-16 m-2"></View>
  //                   <TouchableOpacity
  //                     key={0}
  //                     className="w-16 h-16 m-2 rounded-full bg-blue-500 flex items-center justify-center"
  //                     onPress={() => {
  //                       if (pinCode.length < 6) {
  //                         setPinCode(pinCode + "0");
  //                         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //                         if (pinCode.length === 5) {
  //                           loginWithCode({
  //                             code: pinCode + "0",
  //                             email,
  //                           })
  //                             .then((loginWithCodeResponse) => {
  //                               console.log(
  //                                 "the login with code response is ",
  //                                 loginWithCodeResponse
  //                               );
  //                               handleNextPress(3);
  //                             })
  //                             .catch((error) => {
  //                               console.log(
  //                                 "There was an error logging in",
  //                                 error
  //                               );
  //                               setPinCode("");
  //                             });
  //                         }
  //                       }
  //                     }}
  //                   >
  //                     <Text className="text-white font-bold text-lg">0</Text>
  //                   </TouchableOpacity>
  //                 </View>

  //                 <View className="flex flex-row w-full justify-between mt-4">
  //                   <TouchableOpacity
  //                     className="p-2 rounded-full border-2 bg-gray-200 shadow"
  //                     onPress={() => handleNextPress(1)}
  //                   >
  //                     <Ionicons name="arrow-back" size={24} color="black" />
  //                   </TouchableOpacity>

  //                   <TouchableOpacity
  //                     className="p-2 rounded-full border-2 bg-gray-200 shadow"
  //                     onPress={() => setPinCode(pinCode.slice(0, -1))}
  //                   >
  //                     <Ionicons
  //                       name="backspace-outline"
  //                       size={24}
  //                       color="black"
  //                     />
  //                   </TouchableOpacity>
  //                 </View>
  //               </View>
  //             </View>
  //           </View>
  //         );

  //       case 3:
  //         return (
  //           <View className="flex-1 bg-white pt-10 w-full h-full mt-auto  justify-center px-6">
  //             <Text>Welcome to Anky!</Text>
  //             {isNotCreated(wallet) && (
  //               <View>
  //                 <Text>You can now create a special bag for you here</Text>
  //                 <TouchableOpacity
  //                   className="p-2 rounded-full border-2 bg-gray-200 shadow"
  //                   onPress={async () => {
  //                     console.log("the user is", user);
  //                     const walletCreationResponse = await wallet.create({
  //                       recoveryMethod: "privy",
  //                     });
  //                     console.log(
  //                       "the wallet creation response is",
  //                       walletCreationResponse
  //                     );
  //                   }}
  //                 >
  //                   <Ionicons name="arrow-back" size={24} color="black" />
  //                 </TouchableOpacity>
  //               </View>
  //             )}
  //           </View>
  //         );

  //       default:
  //         return null;
  //     }
  //   };

  return (
    <View className="flex-1 bg-white pt-10 w-full h-full">
      <View className="items-center p-5">
        <View className="flex flex-row justify-between w-full">
          <Text className="text-2xl font-bold mr-auto pl-2 mb-2">
            @ <Text className="blur-2xl">**************</Text>
          </Text>
          <View className="flex flex-row gap-4">
            <TouchableOpacity
              onPress={() => alert("Settings")}
              disabled
              className="bg-blue-200 rounded-full p-2"
            >
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity disabled className="bg-blue-200 rounded-full p-2">
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex flex-row justify-between w-full items-center">
          <View className="relative">
            <Image
              source={require("@/assets/images/anky.png")}
              className="w-24 h-24 rounded-full mb-2.5"
            />
            <TouchableOpacity
              onPress={() => alert("Edit")}
              disabled
              className="absolute bottom-0 right-0"
            >
              <Text className="text-3xl">👽</Text>
            </TouchableOpacity>
          </View>

          <View className="flex flex-row gap-4 flex-1 px-16 justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold">0</Text>
              <Text className="text-sm text-gray-600">ankys</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">?</Text>
              <Text className="text-sm text-gray-600">followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold">?</Text>
              <Text className="text-sm text-gray-600">following</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity className="w-fit border-2 border-yellow-400 rounded-lg p-4  my-4">
          <View className="flex-row justify-between w-full gap-2">
            <View className="flex-row items-center">
              <AetherCoin width={40} height={40} />
              <Text className="ml-2 text-lg">0</Text>
            </View>
            <View className="flex-row items-center">
              <LuminaCoin width={40} height={40} />
              <Text className="ml-2 text-lg">0</Text>
            </View>
            <View className="flex-row items-center">
              <TerraCoin width={40} height={40} />
              <Text className="ml-2 text-lg">0</Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center mt-2">
            <Text className="ml-auto text-sm text-gray-600">
              Balance: 0 $newen
            </Text>
          </View>
        </TouchableOpacity>

        <Text className="text-left w-full font-bold mb-1">
          Charmichael Elements
        </Text>
        <Text className="text-lg mb-1 w-full text-left">
          Here goes your bio.
        </Text>

        <View className="flex-row mt-2 ">
          <TouchableOpacity
            className={`border-b-2 ${
              viewMode === "ankys" ? "border-gray-300" : "border-transparent"
            } px-4 py-2 mr-4`}
            onPress={() => setViewMode("ankys")}
          >
            <Text
              className={`${
                viewMode === "ankys"
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              Ankys
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`border-b-2 ${
              viewMode === "drafts" ? "border-gray-300" : "border-transparent"
            } px-4 py-2 mr-4`}
            onPress={() => setViewMode("drafts")}
          >
            <Text
              className={`${
                viewMode === "drafts"
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              Drafts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`border-b-2 ${
              viewMode === "collected"
                ? "border-gray-300"
                : "border-transparent"
            } px-4 py-2`}
            onPress={() => setViewMode("collected")}
          >
            <Text
              className={`${
                viewMode === "collected"
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              Collected
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {viewMode === "ankys" && (
        <View className="p-4">
          <Text>
            Your completed 8 minute writing sessions represent "an Anky".
          </Text>
        </View>
      )}
      {viewMode === "drafts" && (
        <View className="p-4">
          <Text className="mb-2">
            Every unfinished writing session will be stored here.
          </Text>
        </View>
      )}
      {viewMode === "collected" && (
        <View className="p-4">
          <Text className="mb-2">
            Any time that you find a piece of writing that you resonate with (or
            an Anky image that you love!) you can collect it with the 💎 icon on
            the feed.
          </Text>
          <Text className="mt-2">
            For doing so you will need $newen, in the form of Aether, Lumina or
            Terra.
          </Text>
        </View>
      )}
      <View className="flex-1 absolute bottom-16 left-0 right-0 items-center justify-center ">
        <Pressable
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 px-8 py-4 rounded-full shadow-lg"
          onPress={async () => {
            try {
              const response = await loginWithFarcaster({
                relyingParty: "https://www.anky.bot",
              });
              console.log("the response is", response);
            } catch (error) {
              console.log(
                "there was an error logging in with farcaster",
                error
              );
            }
          }}
        >
          <Text className="text-white font-bold text-4xl">
            login with warpcast
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default NotLoggedInUserView;
