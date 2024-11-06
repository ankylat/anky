import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Cast } from "../types/Cast";
import * as Device from "expo-device";
import { User, UserMetadata } from "../types/User";
import { WritingSession } from "../types/Anky";
import { useQuilibrium } from "./QuilibriumContext";
import { getLocales } from "expo-localization";
import { v4 as uuidv4 } from "uuid";
import { Dimensions, Platform } from "react-native";
import { registerAnonUser } from "../api";
import { prettyLog } from "../app/lib/user";

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
  const [anonymousId, setAnonymousId] = useState<string>("");
  const { user, isReady } = useQuilibrium();

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  const collectUserMetadata = async (): Promise<UserMetadata> => {
    const { width, height } = Dimensions.get("window");
    const deviceLocales = getLocales();

    return {
      device_id: Device.osInternalBuildId || null,
      platform: Platform.OS,
      device_model: Device.modelName || "Unknown",
      os_version: Device.osVersion || "Unknown",
      app_version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
      screen_width: width,
      screen_height: height,
      locale: deviceLocales[0]?.languageCode || "en",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      user_agent: `Anky/${process.env.EXPO_PUBLIC_APP_VERSION} (${Platform.OS})`,
      installation_source:
        (await AsyncStorage.getItem("installation_source")) || "organic",
    };
  };

  const initializeAnonymousUser = async () => {
    try {
      console.log("Removing anonymousId from local storage");
      await AsyncStorage.removeItem("anonymousId");
      // Check if we already have an anonymous ID
      const storedAnonymousId = await AsyncStorage.getItem("anonymousId");
      console.log("CHECKING IF ANONYMOUS ID EXISTS", storedAnonymousId);

      if (!storedAnonymousId) {
        const newAnonymousId = uuidv4();
        const metadata = await collectUserMetadata();
        console.log("Metadata collected", metadata);

        const newAnonUser: User = {
          id: newAnonymousId,
          user_metadata: metadata,
          total_writing_time: 0,
          last_session_date: null,
          is_anonymous: true,
        };

        // Register anonymous user with backend
        const registeredUser = await registerAnonUser(newAnonUser);
        prettyLog(
          registeredUser,
          "Registered anon user on the backend database"
        );

        if (registeredUser) {
          await AsyncStorage.setItem(
            "user_jwt_token",
            registeredUser?.jwt || ""
          );
          await AsyncStorage.setItem("user_id", newAnonymousId);
          await AsyncStorage.setItem("userMetadata", JSON.stringify(metadata));
          setAnonymousId(newAnonymousId);
          console.log("NEW Anonymous user registered successfully");
        }
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
      await AsyncStorage.removeItem("user_id");

      const userLocal = await AsyncStorage.getItem("user_id");
      if (!user || !userLocal) {
        await AsyncStorage.removeItem("writing_attempts");
        await initializeAnonymousUser();
      }

      const storedDrafts = await AsyncStorage.getItem("writingSessions");
      if (storedDrafts) {
        const parsedDrafts = JSON.parse(storedDrafts);
        // Sort by date and take the most recent sessions
        const recentDrafts = parsedDrafts
          .sort(
            (a: WritingSession, b: WritingSession) =>
              new Date(b.starting_timestamp).getTime() -
              new Date(a.starting_timestamp).getTime()
          )
          .slice(0, 50);
        setDrafts(recentDrafts);
        console.log(
          "Recent user drafts loaded from local storage",
          recentDrafts.length
        );
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
