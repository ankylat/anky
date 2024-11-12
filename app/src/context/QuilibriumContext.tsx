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
interface QuilibriumContextValue {
  user: ReturnType<typeof usePrivy>["user"];
  isReady: ReturnType<typeof usePrivy>["isReady"];
  getAccessToken: ReturnType<typeof usePrivy>["getAccessToken"];
  ankyUser: FarcasterAccount | null;
  setAnkyUser: (user: FarcasterAccount | null) => void;
}

// Create the context with a default value
const QuilibriumContext = createContext<QuilibriumContextValue | undefined>(
  undefined
);

// Custom hook for using the Quilibrium context
export const useQuilibrium = () => {
  const context = useContext(QuilibriumContext);
  if (context === undefined) {
    throw new Error("useQuilibrium must be used within a QuilibriumProvider");
  }
  return context;
};

// Provider component
export const QuilibriumProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ankyUser, setAnkyUser] = useState<FarcasterAccount | null>(null);
  const { user, isReady, getAccessToken } = usePrivy();
  useEffect(() => {
    AsyncStorage.getItem("ankyUser").then((data) => {
      if (!user && data) {
        setAnkyUser(JSON.parse(data));
      }
    });
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      isReady,
      getAccessToken,
      ankyUser,
      setAnkyUser,
    }),
    [user, isReady, getAccessToken, ankyUser, setAnkyUser]
  );

  return (
    <QuilibriumContext.Provider value={contextValue}>
      {children}
    </QuilibriumContext.Provider>
  );
};

// This QuilibriumProvider now wraps the usePrivy hook and exposes the user, isReady,
// and getAccessToken properties. It can be used in other components as follows:
// const { user, isReady } = useQuilibrium();
