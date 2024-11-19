import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { getAnkyverseDay, getCurrentAnkyverseDay } from "../app/lib/ankyverse";
import { AnkyUser } from "../types/User";
import { Anky, WritingSession } from "../types/Anky";
import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";

interface AnkyContextType {
  loading: boolean;
  error: string | null;
  isWritingGameVisible: boolean;
  setIsWritingGameVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isUserWriting: boolean;
  setIsUserWriting: React.Dispatch<React.SetStateAction<boolean>>;

  userStreak: number | null;
  setUserStreak: React.Dispatch<React.SetStateAction<number | null>>;
  userAnkys: Anky[];
  setUserAnkys: React.Dispatch<React.SetStateAction<Anky[]>>;
  userDrafts: WritingSession[];
  setUserDrafts: React.Dispatch<React.SetStateAction<WritingSession[]>>;
  userCollectedAnkys: Anky[];
  setUserCollectedAnkys: React.Dispatch<React.SetStateAction<Anky[]>>;
  didUserWriteToday: boolean;
  setDidUserWriteToday: React.Dispatch<React.SetStateAction<boolean>>;
  writingSession: WritingSession | null;
  setWritingSession: React.Dispatch<
    React.SetStateAction<WritingSession | null>
  >;
  conversationWithAnky: string[];
  setConversationWithAnky: React.Dispatch<React.SetStateAction<string[]>>;
}

const AnkyContext = createContext<AnkyContextType | undefined>(undefined);

export const useAnky = () => {
  console.log("useAnky hook called");
  const context = useContext(AnkyContext);
  if (!context) {
    console.error("useAnky must be used within an AnkyProvider");
    throw new Error("useAnky must be used within an AnkyProvider");
  }
  return context;
};

export const AnkyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  console.log("AnkyProvider initialized");
  const { ankyUser, setAnkyUser, isLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWritingGameVisible, setIsWritingGameVisible] = useState(true);

  const [didUserWriteToday, setDidUserWriteToday] = useState(false);
  const [isUserWriting, setIsUserWriting] = useState(false);

  const [userStreak, setUserStreak] = useState<number | null>(null);

  const [userAnkys, setUserAnkys] = useState<Anky[]>([]);
  const [userDrafts, setUserDrafts] = useState<WritingSession[]>([]);
  const [userCollectedAnkys, setUserCollectedAnkys] = useState<Anky[]>([]);

  const [writingSession, setWritingSession] = useState<WritingSession | null>(
    null
  );
  const [currentTrack, setCurrentTrack] = useState("1");

  const [conversationWithAnky, setConversationWithAnky] = useState<string[]>(
    []
  );

  const [openMusicModal, setOpenMusicModal] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
  console.log("API URL:", API_URL);

  const checkAnkyStatus = async () => {
    console.log("Checking Anky status...");
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/status`);
      console.log("Anky status response:", response.data);
      return response.data.status === "ok";
    } catch (err) {
      console.error("Failed to check Anky status:", err);
      setError("Failed to check Anky status");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkDayAndWritingStatus = async () => {
      console.log("CHECKING DAY AND WRITING STATUS", ankyUser);
      const today = new Date();
      console.log("Current date:", today);
      const lastWritingDay = await AsyncStorage.getItem("last_user_wrote");
      console.log("Last writing day:", lastWritingDay);
      const currentAnkyverseDay = getAnkyverseDay(today);
      console.log("Current Ankyverse day:", currentAnkyverseDay);
      const today_on_ankyverse = `S${currentAnkyverseDay.currentSojourn}W${currentAnkyverseDay.wink}`;
      console.log("Today on Ankyverse:", today_on_ankyverse);

      if (!lastWritingDay || lastWritingDay !== today_on_ankyverse) {
        console.log("USER DID NOT WRITE TODAY");
        setDidUserWriteToday(false);

        // Check if streak should be reset
        if (lastWritingDay) {
          const [lastSojourn, lastWink] = lastWritingDay
            .match(/\d+/g)!
            .map(Number);
          const isConsecutive =
            (currentAnkyverseDay.currentSojourn === lastSojourn &&
              currentAnkyverseDay.wink === lastWink + 1) ||
            (currentAnkyverseDay.currentSojourn === lastSojourn + 1 &&
              lastWink === 7 &&
              currentAnkyverseDay.wink === 1);

          if (!isConsecutive) {
            console.log("STREAK BROKEN - Resetting to 0");
            setUserStreak(0);
          }
        }
      } else {
        console.log("USER WROTE TODAY");
        setDidUserWriteToday(true);
        // Increment streak if this is first time writing today
        const currentStreak =
          (await AsyncStorage.getItem("user_streak")) || "0";
        const newStreak = parseInt(currentStreak) + 1;
        await AsyncStorage.setItem("user_streak", newStreak.toString());
        setUserStreak(newStreak);
      }
    };
    console.log("THE IS LOADING IS", isLoading);
    if (ankyUser) checkDayAndWritingStatus();
  }, [ankyUser]);

  const value = {
    checkAnkyStatus,
    loading,
    error,
    isWritingGameVisible,
    setIsWritingGameVisible,
    isUserWriting,
    setIsUserWriting,
    userStreak,
    setUserStreak,
    userAnkys,
    setUserAnkys,
    userDrafts,
    setUserDrafts,
    userCollectedAnkys,
    setUserCollectedAnkys,
    didUserWriteToday,
    setDidUserWriteToday,
    writingSession,
    setWritingSession,
    conversationWithAnky,
    setConversationWithAnky,
  };

  console.log("AnkyContext value:", value);
  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
};
