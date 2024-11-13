import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePrivy } from "@privy-io/expo";
import { FarcasterAccount } from "@/src/types/User";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define the shape of our context value
interface FarcasterContextValue {
  user: ReturnType<typeof usePrivy>["user"];
  isReady: ReturnType<typeof usePrivy>["isReady"];
  getAccessToken: ReturnType<typeof usePrivy>["getAccessToken"];
  farcasterUser: FarcasterAccount | null;
  setFarcasterUser: (user: FarcasterAccount | null) => void;
}

// Create the context with a default value
const FarcasterContext = createContext<FarcasterContextValue | undefined>(
  undefined
);

// Custom hook for using the Farcaster context
export const useFarcaster = () => {
  const context = useContext(FarcasterContext);
  if (context === undefined) {
    throw new Error("useFarcaster must be used within a FarcasterProvider");
  }
  return context;
};

// Provider component
export const FarcasterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [farcasterUser, setFarcasterUser] = useState<FarcasterAccount | null>(
    null
  );
  const { user, isReady, getAccessToken } = usePrivy();

  useEffect(() => {
    AsyncStorage.getItem("farcasterUser").then((data) => {
      if (!user && data) {
        setFarcasterUser(JSON.parse(data));
      }
    });
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      isReady,
      getAccessToken,
      farcasterUser,
      setFarcasterUser,
    }),
    [user, isReady, getAccessToken, farcasterUser, setFarcasterUser]
  );

  return (
    <FarcasterContext.Provider value={contextValue}>
      {children}
    </FarcasterContext.Provider>
  );
};
