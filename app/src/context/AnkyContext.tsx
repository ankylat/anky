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
  musicButtonPressed: () => void;
  openMusicModal: boolean;
  setOpenMusicModal: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState("1");
  const [nextTrack, setNextTrack] = useState("2");
  const [previousTrack, setPreviousTrack] = useState("0");
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

  async function musicButtonPressed() {
    console.log("Music button pressed");
    const [tapStartTime, setTapStartTime] = useState<number | null>(null);
    const [tapEndTime, setTapEndTime] = useState<number | null>(null);
    const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(
      null
    );

    console.log("Tap times:", { tapStartTime, tapEndTime });
    const tap_intensity =
      tapStartTime && tapEndTime && tapEndTime - tapStartTime > 500
        ? "intentional"
        : "light";
    console.log("Tap intensity:", tap_intensity);

    // Stop any currently playing audio
    if (audioPlayer) {
      console.log("Stopping current audio");
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }

    switch (tap_intensity) {
      case "light":
        console.log("Light tap - playing track 1");
        const newAudio = new Audio(`/assets/music/1.mp3`);
        setAudioPlayer(newAudio);
        setCurrentTrack("1");
        newAudio.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
        break;
      case "intentional":
        console.log("Intentional tap - opening music modal");
        setOpenMusicModal(true);
        break;
    }
  }

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
    musicButtonPressed,
    openMusicModal,
    setOpenMusicModal,
  };

  console.log("AnkyContext value:", value);
  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
};
