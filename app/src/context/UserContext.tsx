import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Cast } from "../types/Cast";
import { User } from "../types/User";

interface UserContextType {
  casts: Cast[];
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  user: User | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = "hello world";
      if (!token) {
        throw new Error("No authentication token found");
      }
      const userFid = 18350;
      const response = await axios.get(`${API_URL}/user-casts/${userFid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCasts(response.data);
      await AsyncStorage.setItem("userCasts", JSON.stringify(response.data));
      setUser({
        fid: 16098,
        display_name: "jp",
        follower_count: 1111,
        following_count: 15018,
        pfp_url:
          "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/b88430bb-e9fc-44d5-1c17-c5ef2107b700/original",
        username: "jpfraneto.eth",
      });
    } catch (err) {
      setError("Failed to fetch user casts");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    await fetchUserData();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const storedCasts = await AsyncStorage.getItem("userCasts");
      if (storedCasts) {
        setCasts(JSON.parse(storedCasts));
      }
      await fetchUserData();
    };

    loadInitialData();
  }, []);

  const value = {
    casts,
    isLoading,
    error,
    refreshUserData,
    user,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
