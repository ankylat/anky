import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Cast } from "../types/Cast";
import * as Device from "expo-device";
import { UserMetadata, AnkyUser, FarcasterAccount } from "../types/User";
import { Anky, WritingSession } from "../types/Anky";
import { getLocales } from "expo-localization";
import { v4 as uuidv4 } from "uuid";
import { Dimensions, Platform } from "react-native";
import { registerAnonUser } from "../api";
import { prettyLog } from "../app/lib/logs";
import {
  fetchWritingSessionFromId,
  getUserLocalCollectedAnkys,
  getUserLocalWritingSessions,
} from "../app/lib/writingGame";
import { usePrivy } from "@privy-io/expo";
import { clearAllUserDataFromLocalStorage } from "../app/lib/development";
import i18n, { getLocalizedPrompt } from "../app/lib/localization";

interface UserContextType {
  ankyUser: AnkyUser | null;

  userAnkys: WritingSession[];
  userDrafts: WritingSession[];
  userCollectedAnkys: WritingSession[];

  setAnkyUser: (user: AnkyUser | null) => void;
  setUserAnkys: (ankys: WritingSession[]) => void;
  setUserDrafts: (drafts: WritingSession[]) => void;
  setUserCollectedAnkys: (collectedAnkys: WritingSession[]) => void;

  createAccountModalVisible: boolean;
  setCreateAccountModalVisible: (visible: boolean) => void;

  isLoading: boolean;
  error: string | null;
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
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [userAnkys, setUserAnkys] = useState<WritingSession[]>([]);
  const [userDrafts, setUserDrafts] = useState<WritingSession[]>([]);
  const [userCollectedAnkys, setUserCollectedAnkys] = useState<
    WritingSession[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState<string>("");
  const [ankyUser, setAnkyUser] = useState<AnkyUser | null>({
    id: "",
    settings: {},
    wallet_address: "",
    created_at: "",
    streak: 0,
    jwt: "",
  });
  const [createAccountModalVisible, setCreateAccountModalVisible] =
    useState<boolean>(false);
  const { user: privy_user, isReady } = usePrivy();

  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
  // clearAllUserDataFromLocalStorage();
  const translated_welcoming_self_inquiry = getLocalizedPrompt();
  const firstUserSetup = async () => {
    await AsyncStorage.setItem(
      "upcoming_prompt",
      translated_welcoming_self_inquiry
    );
    const newAnonymousId = uuidv4();
    const newAnonUser: AnkyUser = {
      id: newAnonymousId,
      settings: {},
      wallet_address: "",
      created_at: new Date().toISOString(),
      streak: 0,
      jwt: "",
    };
    const metadata = await collectUserMetadata();
    newAnonUser.metadata = metadata;
    const { user, jwt } = await registerAnonUser(newAnonUser);
    prettyLog(user, "Registered anon user on the backend database");
    if (user) {
      await AsyncStorage.setItem("user_jwt_token", jwt);
      await AsyncStorage.setItem("user_id", newAnonymousId);
      newAnonUser.settings = {};
      newAnonUser.wallet_address = user.wallet_address;
      setAnkyUser(newAnonUser);
      await AsyncStorage.setItem("anky_user", JSON.stringify(newAnonUser));
      prettyLog(newAnonUser, "New Anky User Registered and stored locally");
    }
  };

  const loadInitialData = async () => {
    try {
      const anky_user_data = await AsyncStorage.getItem("anky_user");
      console.log("ANKY USER DATA", anky_user_data);
      if (anky_user_data) {
        setAnkyUser(JSON.parse(anky_user_data));
      } else {
        await firstUserSetup();
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsLoading(false);
      await fetchUserData();
      setDataLoaded(true);
    }
  };

  const fetchUserData = async () => {
    if (!isReady || isLoading) return;
    setError(null);
    try {
      // Get writing sessions from writingGame.ts helper
      const writingSessionsIds = await getUserLocalWritingSessions();
      const user_collected_ankys = await getUserLocalCollectedAnkys();

      if (writingSessionsIds.length > 0) {
        // Sort all sessions by timestamp and take latest 50
        const latestSessions = writingSessionsIds
          .sort(
            (a, b) =>
              new Date(b?.starting_timestamp ?? "").getTime() -
              new Date(a?.starting_timestamp ?? "").getTime()
          )
          .slice(0, 50);

        // Fetch full session data for all 50 sessions in parallel
        const sessionPromises = latestSessions.map((session) =>
          fetchWritingSessionFromId(session.session_id!)
        );
        const fullSessions = await Promise.all(sessionPromises);
        const validSessions = fullSessions.filter(
          (session): session is WritingSession => session !== null
        );

        // Split into regular drafts and ankys
        const regularDrafts = validSessions.filter(
          (session) => !session.is_anky
        );
        const ankyDrafts = validSessions.filter((session) => session.is_anky);

        setUserDrafts(regularDrafts);
        setUserAnkys(ankyDrafts);
        setUserCollectedAnkys(user_collected_ankys);
        console.log(
          "Writing sessions loaded:",
          `${regularDrafts.length} drafts, ${ankyDrafts.length} Ankys, ${user_collected_ankys.length} collected Ankys`
        );
      } else {
        console.log("No writing sessions found");
        setUserAnkys([]);
        setUserDrafts([]);
        setUserCollectedAnkys([]);
      }

      console.log("User data fetched successfully");
    } catch (err) {
      setError("Failed to fetch user data");
      console.error("Error fetching user data:", err);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    loadInitialData();
  }, []);

  const value = useMemo(
    () => ({
      userAnkys,
      setUserAnkys,
      userDrafts,
      setUserDrafts,
      userCollectedAnkys,
      setUserCollectedAnkys,
      isLoading,
      error,
      anonymousId,
      ankyUser,
      setAnkyUser,
      createAccountModalVisible,
      setCreateAccountModalVisible,
    }),
    [
      userAnkys,
      userDrafts,
      userCollectedAnkys,
      isLoading,
      error,
      anonymousId,
      ankyUser,
      createAccountModalVisible,
      setCreateAccountModalVisible,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
