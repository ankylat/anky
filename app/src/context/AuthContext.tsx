import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types/User";

// Define the shape of our auth context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (fid: number) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  // Memoize the authentication status
  const isAuthenticated = useMemo(() => !!user, [user]);

  // Effect to check for existing auth on mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const storedFid = await AsyncStorage.getItem("farcaster_fid");
        if (storedFid) {
          await login(parseInt(storedFid, 10));
        }
      } catch (error) {
        console.error("Error checking existing auth:", error);
      }
    };

    checkExistingAuth();
  }, []);

  // Login function
  const login = useCallback(async (fid: number) => {
    console.log(`Attempting to login with FID: ${fid}`);
    try {
      // TODO: Implement actual login with Farcaster
      // This is a mock implementation
      const response = await fetch(`https://api.farcaster.xyz/v1/user/${fid}`);
      const userData: User = await response.json();

      setUser(userData);
      await AsyncStorage.setItem("farcaster_fid", fid.toString());
      console.log("Login successful", userData);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    console.log("Logging out");
    setUser(null);
    try {
      await AsyncStorage.removeItem("farcaster_fid");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, []);

  // Update user function
  const updateUser = useCallback((userData: Partial<User>) => {
    console.log("Updating user data", userData);
    setUser((prevUser) => (prevUser ? { ...prevUser, ...userData } : null));
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
      updateUser,
    }),
    [user, isAuthenticated, login, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
