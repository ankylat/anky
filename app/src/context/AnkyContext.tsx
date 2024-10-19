import React, { createContext, useContext, useState } from "react";
import axios from "axios";

interface AnkyContextType {
  sendWritingToAnky: (writing: string) => Promise<void>;
  fetchFromAnky: () => Promise<string>;
  checkAnkyStatus: () => Promise<boolean>;
  loading: boolean;
  error: string | null;
  isWriteModalVisible: boolean;
  setIsWriteModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isUserWriting: boolean;
  setIsUserWriting: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWriteModalVisible, setIsWriteModalVisible] = useState(true);
  const [isUserWriting, setIsUserWriting] = useState(false);

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
    sendWritingToAnky,
    fetchFromAnky,
    checkAnkyStatus,
    loading,
    error,
    isWriteModalVisible,
    setIsWriteModalVisible,
    isUserWriting,
    setIsUserWriting,
  };

  return <AnkyContext.Provider value={value}>{children}</AnkyContext.Provider>;
};
