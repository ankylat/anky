import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WritingSession } from "../types/Anky";

interface NetworkContextValue {
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  pendingWrites: WritingSession[];
  syncPendingWrites: () => Promise<void>;
  socket: Socket | null;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(
  undefined
);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const PENDING_WRITES_KEY = "@anky/pending_writes";

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(
    null
  );
  const [pendingWrites, setPendingWrites] = useState<WritingSession[]>([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("sync_complete", (timestamp: number) => {
      setLastSyncTimestamp(timestamp);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Load pending writes from storage on startup
  useEffect(() => {
    const loadPendingWrites = async () => {
      try {
        const stored = await AsyncStorage.getItem(PENDING_WRITES_KEY);
        if (stored) {
          setPendingWrites(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading pending writes:", error);
      }
    };
    loadPendingWrites();
  }, []);

  // Save pending writes to storage whenever they change
  useEffect(() => {
    const savePendingWrites = async () => {
      try {
        await AsyncStorage.setItem(
          PENDING_WRITES_KEY,
          JSON.stringify(pendingWrites)
        );
      } catch (error) {
        console.error("Error saving pending writes:", error);
      }
    };
    savePendingWrites();
  }, [pendingWrites]);

  const syncPendingWrites = useCallback(async () => {
    if (!isConnected || pendingWrites.length === 0) return;

    try {
      for (const write of pendingWrites) {
        await socket?.emit("sync_writing_session", write);
      }
      setPendingWrites([]);
    } catch (error) {
      console.error("Error syncing pending writes:", error);
    }
  }, [isConnected, pendingWrites, socket]);

  // Attempt to sync pending writes whenever connection is restored
  useEffect(() => {
    if (isConnected) {
      syncPendingWrites();
    }
  }, [isConnected, syncPendingWrites]);

  const value = useMemo(
    () => ({
      isConnected,
      lastSyncTimestamp,
      pendingWrites,
      syncPendingWrites,
      socket,
    }),
    [isConnected, lastSyncTimestamp, pendingWrites, syncPendingWrites, socket]
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};
