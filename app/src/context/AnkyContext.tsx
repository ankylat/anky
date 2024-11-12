import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { getCurrentAnkyverseDay } from "../app/lib/ankyverse";
import { WritingGameProps } from "../types/WritingGame";
import { AnkyUser } from "../types/User";
import { Anky, WritingSession } from "../types/Anky";

interface AnkyContextType {
  ankyUser: AnkyUser | null;
  sendWritingToAnky: (writing: string) => Promise<void>;
  fetchFromAnky: () => Promise<string>;
  checkAnkyStatus: () => Promise<boolean>;
  loading: boolean;
  error: string | null;
  isWritingGameVisible: boolean;
  setIsWritingGameVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isUserWriting: boolean;
  setIsUserWriting: React.Dispatch<React.SetStateAction<boolean>>;

  currentAnky: Anky | null;
  setCurrentAnky: React.Dispatch<React.SetStateAction<Anky | null>>;
  userStreak: number;
  setUserStreak: React.Dispatch<React.SetStateAction<number>>;
  userAnkys: Anky[];
  setUserAnkys: React.Dispatch<React.SetStateAction<Anky[]>>;
  userDrafts: WritingSession[];
  setUserDrafts: React.Dispatch<React.SetStateAction<WritingSession[]>>;
  userCollectedAnkys: Anky[];
  setUserCollectedAnkys: React.Dispatch<React.SetStateAction<Anky[]>>;
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
  const [ankyUser, setAnkyUser] = useState<AnkyUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWritingGameVisible, setIsWritingGameVisible] = useState(false);
  const [isUserWriting, setIsUserWriting] = useState(false);
  const ankyverseDay = getCurrentAnkyverseDay();
  const [currentAnky, setCurrentAnky] = useState<Anky | null>({
    id: "",
    user_id: "",
    writing_session_id: "",
    prompt: "",
    anky_reflection: null,
    anky_inquiry: "tell me who you are",
    image_url: require("@/assets/images/anky.png"),
    image_ipfs_hash: null,
    status: null,
    cast_hash: null,
    created_at: new Date(),
    updated_at: new Date(),
    previous_anky_id: null,
    name: "",
    token_address: null,
  });
  const [userStreak, setUserStreak] = useState(1);
  const [userAnkys, setUserAnkys] = useState<Anky[]>([]);
  const [userDrafts, setUserDrafts] = useState<WritingSession[]>([]);
  const [userCollectedAnkys, setUserCollectedAnkys] = useState<Anky[]>([]);

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  const sendWritingToAnky = async (writing: string) => {
    setLoading(true);
    setError(null);
    console.log("the writing is: ", writing);
    return;
    try {
      const response = await axios.post(`${API_URL}/send-writing`, { writing });
      console.log(
        "the response after sending the writing to anky is: ",
        response.data
      );
      return response.data;
    } catch (err) {
      setError("Failed to send writing to Anky");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromAnky = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/fetch-anky`);
      return response.data;
    } catch (err) {
      setError("Failed to fetch from Anky");
      console.error(err);
      return "";
    } finally {
      setLoading(false);
    }
  };

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

  const value = {
    ankyUser,
    sendWritingToAnky,
    fetchFromAnky,
    checkAnkyStatus,
    loading,
    error,
    isWritingGameVisible,
    setIsWritingGameVisible,
    isUserWriting,
    setIsUserWriting,
    currentAnky,
    setCurrentAnky,
    userStreak,
    setUserStreak,
    userAnkys,
    setUserAnkys,
    userDrafts,
    setUserDrafts,
    userCollectedAnkys,
    setUserCollectedAnkys,
  };

  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
};
