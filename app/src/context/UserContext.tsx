import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Cast } from "../types/Cast";
import { User } from "../types/User";
import { WritingSession } from "../types/Anky";
import { useQuilibrium } from "./QuilibriumContext";
import { v4 as uuidv4 } from "uuid";

interface UserContextType {
  casts: Cast[];
  drafts: WritingSession[];
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
  userMintedAnkys: WritingSession[];
  anonymousId: string | null;
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
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const { user, isReady } = useQuilibrium();

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  const initializeAnonymousUser = async () => {
    try {
      // Check if we already have an anonymous ID
      const storedAnonymousId = await AsyncStorage.getItem("anonymousId");

      if (!storedAnonymousId) {
        // Generate new anonymous ID if none exists
        const newAnonymousId = uuidv4();

        // Register anonymous user with backend
        const response = await axios.post(
          `${API_URL}/users/anonymous-register`,
          {
            anonymousId: newAnonymousId,
          }
        );

        if (response.status === 200) {
          await AsyncStorage.setItem("anonymousId", newAnonymousId);
          setAnonymousId(newAnonymousId);
          console.log("Anonymous user registered successfully");
        }
      } else {
        setAnonymousId(storedAnonymousId);
        console.log("Retrieved existing anonymous ID");
      }
    } catch (err) {
      console.error("Error initializing anonymous user:", err);
      setError("Failed to initialize anonymous user");
    }
  };

  const fetchUserData = async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      // Initialize anonymous user if no authenticated user
      if (!user) {
        await initializeAnonymousUser();
      }

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

  useEffect(() => {
    fetchUserData();
  }, [isReady, user]);

  const refreshUserData = async () => {
    console.log("Refreshing user data...");
    await fetchUserData();
  };

  const value = {
    casts,
    drafts,
    userMintedAnkys,
    isLoading,
    error,
    refreshUserData,
    anonymousId,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
