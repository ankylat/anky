import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Cast } from "../types/Cast";
import { User } from "../types/User";
import { WritingSession } from "../types/Anky"; // Assuming you have a Draft type defined
import { useQuilibrium } from "./QuilibriumContext";

interface UserContextType {
  casts: Cast[];
  drafts: WritingSession[];
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  userMintedAnkys: WritingSession[];
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
  const [drafts, setDrafts] = useState<WritingSession[]>([]);
  const [userMintedAnkys, setUserMintedAnkys] = useState<WritingSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useQuilibrium();
  const farcasterAccount = user?.linked_accounts.find(
    (account) => account.type === "farcaster"
  );

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  const userFid = farcasterAccount?.fid || 1; // TODO: Replace with actual user FID retrieval

  const fetchUserData = async () => {
    console.log("Fetching user data...");
    setIsLoading(true);
    setError(null);
    try {
      const token = "hello world"; // TODO: Replace with actual token retrieval
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Fetch user casts
      console.log("Fetching user casts...", API_URL);
      const castsResponse = await axios.get(
        `${API_URL}/user-casts/${userFid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(
        "The user casts are: ",
        JSON.stringify(castsResponse.data, null, 2)
      );
      setCasts(castsResponse.data);
      await AsyncStorage.setItem(
        "userCasts",
        JSON.stringify(castsResponse.data)
      );

      // Fetch user drafts from local storage
      console.log("Fetching user drafts from local storage...");
      const storedDrafts = await AsyncStorage.getItem("writingSessions");
      if (storedDrafts) {
        const parsedDrafts = JSON.parse(storedDrafts);
        setDrafts(parsedDrafts);
        console.log("User drafts loaded from local storage", parsedDrafts);
      } else {
        console.log("No drafts found in local storage");
        setDrafts([]);
      }

      console.log("User data fetched successfully");
    } catch (err) {
      setError("Failed to fetch user data");
      console.error("Error fetching user data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    console.log("Refreshing user data...");
    await fetchUserData();
  };

  const fetchUserMintedAnkys = async () => {
    console.log("Fetching user minted ankys...");
    const mintedAnkysResponse = await axios.get(
      `${API_URL}/user-minted-ankys/${userFid}`
    );
    setUserMintedAnkys(mintedAnkysResponse.data);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      console.log("Loading initial data...");
      const storedCasts = await AsyncStorage.getItem("userCasts");
      const storedDrafts = await AsyncStorage.getItem("userDrafts");
      const storedCollectedAnkys = await AsyncStorage.getItem(
        "userMintedAnkys"
      );
      if (storedCasts) {
        setCasts(JSON.parse(storedCasts));
      }
      if (storedDrafts) {
        setDrafts(JSON.parse(storedDrafts));
      }
      if (storedCollectedAnkys) {
        setUserMintedAnkys(JSON.parse(storedCollectedAnkys));
      }
      await fetchUserData();
    };

    loadInitialData();
  }, []);

  const value = {
    casts,
    drafts,
    userMintedAnkys,
    isLoading,
    error,
    refreshUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
