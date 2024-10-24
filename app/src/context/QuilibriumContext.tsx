import React, { createContext, useContext, useMemo } from "react";
import { usePrivy } from "@privy-io/expo";

// Define the shape of our context value
interface QuilibriumContextValue {
  user: ReturnType<typeof usePrivy>["user"];
  isReady: ReturnType<typeof usePrivy>["isReady"];
  getAccessToken: ReturnType<typeof usePrivy>["getAccessToken"];
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
  const { user, isReady, getAccessToken } = usePrivy();

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      isReady,
      getAccessToken,
    }),
    [user, isReady, getAccessToken]
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
