import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { getCurrentAnkyverseDay } from "../app/lib/ankyverse";
import { WritingGameProps } from "../types/WritingGame";
import { AnkyUser } from "../types/User";
import { WritingSession } from "../types/Anky";

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
  writingGameProps: WritingGameProps;
  setWritingGameProps: React.Dispatch<React.SetStateAction<WritingGameProps>>;
  userWritingSessions: WritingSession[];
  setUserWritingSessions: React.Dispatch<
    React.SetStateAction<WritingSession[]>
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
  const [ankyUser, setAnkyUser] = useState<AnkyUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWritingGameVisible, setIsWritingGameVisible] = useState(true);
  const [isUserWriting, setIsUserWriting] = useState(false);
  const ankyverseDay = getCurrentAnkyverseDay();
  const [userWritingSessions, setUserWritingSessions] = useState<
    WritingSession[]
  >([]);
  const [writingGameProps, setWritingGameProps] = useState<WritingGameProps>({
    targetDuration: 480,
    directions: {
      center: {
        direction: "center",
        prompt: "tell us who you are",
        color: ankyverseDay.currentColor.main,
        textColor: ankyverseDay.currentColor.textColor,
      },
      up: {
        direction: "up",
        prompt: "hello world",
        color: "#000000",
        textColor: "#FFFFFF",
      },
      right: {
        direction: "right",
        prompt: "what's your biggest dream?",
        color: "#1a237e",
        textColor: "#FFFFFF",
      },
      down: {
        direction: "down",
        prompt: "describe your perfect day",
        color: "#004d40",
        textColor: "#FFFFFF",
      },
      left: {
        direction: "left",
        prompt: "what's your greatest fear?",
        color: "#b71c1c",
        textColor: "#FFFFFF",
      },
    },
  });

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
    writingGameProps,
    setWritingGameProps,
    userWritingSessions,
    setUserWritingSessions,
  };

  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
};
