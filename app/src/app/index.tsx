import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { useRouter } from "expo-router";
import WritingGame from "@/src/components/WritingGame";
import { getCurrentAnkyverseDay } from "./lib/ankyverse";
import { WritingSession } from "@/src/types/Anky";

export default function Index() {
  const [hasCompletedInitialPrompt, setHasCompletedInitialPrompt] = useState<
    boolean | null
  >(null);
  const [writingSession, setWritingSession] = useState<
    WritingSession | undefined
  >(undefined);
  const router = useRouter();
  const ankyverseDay = getCurrentAnkyverseDay();
  console.log("HELLO WORLD");

  useEffect(() => {
    const checkInitialPrompt = async () => {
      await AsyncStorage.removeItem("@initial_prompt_completed");

      try {
        const status = await AsyncStorage.getItem("@initial_prompt_completed");
        setHasCompletedInitialPrompt(status === "true");
        if (status === "true") {
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error("Error checking initial prompt status:", error);
        setHasCompletedInitialPrompt(false);
      }
    };

    checkInitialPrompt();
  }, []);

  const targetSeconds = 12;
  const handleGameOver = async (wordsWritten: number, timeSpent: number) => {
    try {
      console.log("SESSION IS OVER", timeSpent);
      if (timeSpent >= targetSeconds) {
        // Check if time spent is greater than target seconds
        await AsyncStorage.setItem("@initial_prompt_completed", "true");
        await AsyncStorage.setItem(
          "@first_entry",
          writingSession?.content || ""
        );
        setHasCompletedInitialPrompt(true);
        router.replace("/onboarding");
      }
    } catch (error) {
      console.error("Error saving prompt completion:", error);
    }
  };

  if (hasCompletedInitialPrompt === null) return null;
  if (hasCompletedInitialPrompt) return null;

  return (
    <View style={{ flex: 1 }}>
      <WritingGame
        secondsBetweenKeystrokes={8}
        onGameOver={handleGameOver}
        ankyverseDay={ankyverseDay}
        writingSession={writingSession}
        setWritingSession={setWritingSession}
        propsModes={{
          targetDuration: targetSeconds,
          directions: {
            center: {
              direction: "center",
              prompt: "tell us who you are",
              color: ankyverseDay.currentColor.main,
              textColor: ankyverseDay.currentColor.textColor,
            },
            up: {
              direction: "up",
              prompt: "tell us who you are",
              color: "#9C27B0", // Purple - representing spirituality/consciousness
              textColor: "#FFFFFF",
            },
            right: {
              direction: "right",
              prompt: "tell us who you are",
              color: "#FF9800", // Orange - representing creativity/expression
              textColor: "#000000",
            },
            down: {
              direction: "down",
              prompt: "tell us who you are",
              color: "#4CAF50", // Green - representing growth/nature
              textColor: "#FFFFFF",
            },
            left: {
              direction: "left",
              prompt: "tell us who you are",
              color: "#2196F3", // Blue - representing wisdom/depth
              textColor: "#FFFFFF",
            },
          },
        }}
      />
    </View>
  );
}
