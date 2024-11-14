import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Vibration,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { usePrivy } from "@privy-io/expo";

interface WritingGameSessionEndedProps {
  sessionDuration: number;
  wordsWritten: number;
  totalTaps: number;
  onClose: () => void;
  targetReached: boolean;
  targetDuration: number;
  sessionId: string;
  onRetry: () => void;
  setGameOver: (gameOver: boolean) => void;
  setCameBackToRead: (cameBackToRead: boolean) => void;
}

const WritingGameSessionEnded: React.FC<WritingGameSessionEndedProps> = ({
  sessionDuration,
  wordsWritten,
  totalTaps,
  onClose,
  targetReached,
  targetDuration,
  sessionId,
  onRetry,
  setGameOver,
  setCameBackToRead,
}) => {
  const [step, setStep] = useState(0);
  const { user } = usePrivy();
  const [notificationsPermission, setNotificationsPermission] = useState(false);

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsPermission(status === "granted");
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationsPermission(status === "granted");
  };

  const handleNextPress = (nextStep: number) => {
    console.log(`Moving to step ${nextStep}`);
    Vibration.vibrate(22);
    setStep(nextStep);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Your Writing Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.floor(sessionDuration)}
                </Text>
                <Text style={styles.statLabel}>seconds</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{wordsWritten}</Text>
                <Text style={styles.statLabel}>words</Text>
              </View>
            </View>
            <View className="flex-row justify-between w-1/2">
              <TouchableOpacity
                style={styles.button}
                className="opacity-40"
                onPress={() => setGameOver(false)}
              >
                <Text style={styles.buttonText}>
                  <Ionicons name="arrow-back" size={24} color="black" />
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleNextPress(1)}
              >
                <Text style={styles.buttonText}>
                  <Ionicons name="arrow-forward" size={24} color="black" />
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 1:
        return (
          <View className="items-center">
            <View
              className="bg-orange-500 rounded-full overflow-hidden w-96 h-96 mb-12 shadow-2xl"
              style={{
                shadowColor: "#ff9800",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Image
                source={require("@/assets/images/anky_seed.png")}
                className="w-full h-full"
                style={{
                  borderWidth: 3,
                  borderColor: "#ffa726",
                  borderRadius: 999,
                }}
              />
            </View>

            <TouchableOpacity
              className={`bg-orange-500 py-3 px-6 rounded-full mt-5 ${
                notificationsPermission ? "opacity-50" : ""
              }`}
              onPress={requestNotificationPermissions}
              disabled={notificationsPermission}
            >
              <Text className="text-black text-base font-bold">
                {notificationsPermission
                  ? "Notifications Enabled"
                  : "Enable Notifications"}
              </Text>
            </TouchableOpacity>
            {!user && (
              <TouchableOpacity
                className="bg-orange-500 py-3 px-6 rounded-full mt-5"
                onPress={onClose}
              >
                <Text className="text-black text-base font-bold">
                  Save Locally & Finish
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderStep()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#000",
    padding: 20,
    justifyContent: "center",
  },
  stepContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FFA500",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#FFF",
  },
  disabledButton: {
    backgroundColor: "#CCC",
  },
});

export default WritingGameSessionEnded;
