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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { usePrivy } from "@privy-io/expo";

interface WritingGameSessionEndedProps {
  sessionDuration: number;
  wordsWritten: number;
  totalTaps: number;
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
  totalTaps,
  initialInquiry,
  onClose,
  targetReached,
  targetDuration,
  sessionId,
  onRetry,
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
            <Text style={styles.title}>Welcome to Anky!</Text>
            <Text style={styles.description}>
              You've just completed your first writing session. Let's walk
              through what happened.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleNextPress(1)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 1:
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
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleNextPress(2)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.description}>
              your mission is to write for 480 seconds. that's 8 minutes. just
              write anything
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (targetReached) {
                  handleNextPress(3);
                } else {
                  console.log("Retrying the writing session");
                  Vibration.vibrate(50);
                  onRetry();
                }
              }}
            >
              <Text style={styles.buttonText}>
                {targetReached ? "Next" : "Try Again"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Anky Creation</Text>
            <Text style={styles.description}>
              your 480 seconds writing session will be used to create a unique
              Anky. We'll notify you when it's ready!
            </Text>
            <TouchableOpacity
              style={[
                styles.button,
                notificationsPermission && styles.disabledButton,
              ]}
              onPress={requestNotificationPermissions}
              disabled={notificationsPermission}
            >
              <Text style={styles.buttonText}>
                {notificationsPermission
                  ? "Notifications Enabled"
                  : "Enable Notifications"}
              </Text>
            </TouchableOpacity>
            {!user && (
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>Save Locally & Finish</Text>
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
