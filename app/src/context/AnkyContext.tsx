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
}

const AnkyContext = createContext<AnkyContextType | undefined>(undefined);

export const useAnky = () => {
  const context = useContext(AnkyContext);
  if (!context) {
    throw new Error("useAnky must be used within an AnkyProvider");
  }
  return context;
};

export const AnkyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  const checkAnkyStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/status`);
      return response.data.status === "ok";
    } catch (err) {
      setError("Failed to check Anky status");
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkDayAndWritingStatus = async () => {
      console.log("CHECKING DAY AND WRITING STATUS", ankyUser);
      const today = new Date();
      const lastWritingDay = await AsyncStorage.getItem("last_user_wrote");
      const currentAnkyverseDay = getAnkyverseDay(today);
      const today_on_ankyverse = `S${currentAnkyverseDay.currentSojourn}W${currentAnkyverseDay.wink}`;
      if (!lastWritingDay || lastWritingDay !== today_on_ankyverse) {
        console.log("USER DID NOT WRITE TODAY");
        setDidUserWriteToday(false);
      } else {
        console.log("USER WROTE TODAY");
        setDidUserWriteToday(true);
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
  };

  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
};
