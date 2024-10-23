import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { spendNewen, TransactionType } from "@/src/app/lib/transactions";
import { usePrivy } from "@privy-io/expo";
import TerraCoin from "@/assets/icons/terra.svg";

interface WritingGameSessionEndedProps {
  sessionDuration: number;
  totalTaps: number;
  wordsWritten: number;
  initialInquiry: {
    prompt: string;
    color: string;
  };
  onClose: () => void;
  targetReached: boolean;
  targetDuration: number;
  sessionId: string;
  onRetry: () => void;
}

const WritingGameSessionEnded: React.FC<WritingGameSessionEndedProps> = ({
  sessionDuration,
  wordsWritten,
  totalTaps = 396,
  initialInquiry,
  onClose,
  targetReached,
  targetDuration,
  sessionId,
  onRetry,
}) => {
  const navigation = useNavigation();
  const consecutiveDays = 1; // Hardcoded for now
  const [rotation] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(1));
  const [notificationsPermission, setNotificationsPermission] = useState(false);
  const { user } = usePrivy();

  useEffect(() => {
    console.log("WritingGameSessionEnded component mounted");
    if (targetReached) {
      startAnkyAnimation();
      checkNotificationPermissions();
    }
    return () => {
      console.log("WritingGameSessionEnded component unmounted");
    };
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsPermission(status === "granted");
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationsPermission(status === "granted");
    if (status === "granted") {
      console.log("User will be notified when Anky is ready");
    }
  };

  const startAnkyAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const handleSendPress = async () => {
    if (targetReached) {
      if (!notificationsPermission) {
        await requestNotificationPermissions();
      } else {
        if (user) {
          await spendNewen({
            type: TransactionType.HURRY_ANKY_CREATION,
            amount: 50,
            userId: user.id,
            sessionId: sessionId,
          });
          console.log("Spent 50 newens to make Anky faster");
        } else {
          // User is not logged in, store locally
          try {
            const localSessions = await AsyncStorage.getItem(
              "localWritingSessions"
            );
            const sessions = localSessions ? JSON.parse(localSessions) : [];
            sessions.push({
              sessionId,
              sessionDuration,
              wordsWritten,
              totalTaps,
              initialInquiry,
              date: new Date().toISOString(),
            });
            await AsyncStorage.setItem(
              "localWritingSessions",
              JSON.stringify(sessions)
            );
            console.log("Session stored locally");
          } catch (error) {
            console.error("Error storing session locally:", error);
          }
        }
      }
    } else {
      onRetry();
    }
  };

  return (
    <View className="flex-1 bg-black px-5 py-20 justify-between">
      <View className="flex-row justify-around mt-2 ">
        <View className="items-center mx-5">
          <Text className="text-white text-5xl font-bold">
            {Math.floor(sessionDuration)}
          </Text>
          <Text className="text-white text-lg font-bold mt-1">seconds</Text>
        </View>
        <View className="items-center mx-5">
          <Text className="text-white text-5xl font-bold">{wordsWritten}</Text>
          <Text className="text-white text-lg font-bold mt-1">words</Text>
        </View>
        <View className="items-center mx-5">
          <Text className="text-yellow-400 text-5xl font-bold">
            {totalTaps}
          </Text>
          <Text className="text-white text-lg font-bold mt-1">taps</Text>
        </View>
      </View>

      {targetReached && (
        <View className="items-center my-1">
          <Text className="text-white text-7xl font-bold">
            {consecutiveDays}
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            CONSECUTIVE DAYS
          </Text>
          <View className="flex-row items-center justify-center mt-2">
            {[...Array(7)].map((_, index) => (
              <View
                key={index}
                className={`w-5 h-5 rounded-full mx-1 ${
                  index < consecutiveDays ? "bg-green-500" : "bg-gray-700"
                }`}
              />
            ))}
          </View>
        </View>
      )}

      {targetReached ? (
        <View className="items-center my-2">
          <View style={{ position: "relative" }}>
            <Animated.Image
              source={require("@/assets/images/anky_seed.png")}
              style={{
                width: 222,
                height: 222,
                shadowColor: "#FFA500",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: "#FFA500",
                opacity: 0.5,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            />
          </View>
        </View>
      ) : (
        <View className="items-center my-2">
          <Text className="text-white text-lg font-bold">
            Next time write for {Math.floor(targetDuration - sessionDuration)}{" "}
            more seconds to get an Anky!
          </Text>
          <View className="w-full bg-gray-700 rounded-full h-4 mt-2">
            <View
              className="bg-yellow-400 h-4 rounded-full"
              style={{ width: `${(sessionDuration / targetDuration) * 100}%` }}
            />
          </View>
        </View>
      )}

      <TouchableOpacity
        className="bg-yellow-400 py-3 px-6 rounded-full mb-16 flex-row items-center justify-center"
        onPress={handleSendPress}
      >
        <Text className="text-black text-lg font-bold text-center">
          {targetReached ? (
            notificationsPermission ? (
              user ? (
                <>
                  Speed up - 2{" "}
                  <TerraCoin
                    width={30}
                    height={30}
                    style={{ marginLeft: 4, marginRight: 4 }}
                  />
                </>
              ) : (
                "Store locally"
              )
            ) : (
              "Enable notifications"
            )
          ) : (
            "Retry"
          )}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default WritingGameSessionEnded;
