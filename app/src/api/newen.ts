import axios from "axios";
import { NewenTransaction } from "../types/Anky";
import { transactions } from "../app/lib/transactions";
import {
  EXPO_PUBLIC_ANKY_API_URL,
  EXPO_PUBLIC_POIESIS_API_KEY,
} from "@/dotenv";

const API_URL = EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = EXPO_PUBLIC_POIESIS_API_KEY;

export const getUserTransactions = async (
  user_id: string,
  user_wallet_address: string,
  user_token: string
): Promise<{ transactions: NewenTransaction[] }> => {
  console.log("fetching the user transactions");
  try {
    const endpoint = `${API_URL}/newen/transactions/s${user_id}`;

    const response = await axios.get(endpoint, {
      headers: {
        "api-key": POIESIS_API_KEY!,
        token: user_token,
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });

    if (response.status !== 200) {
      console.error("Failed to process writing sessions:", response.status);
      throw new Error("Failed to process writing sessions");
    }
    console.log("response", response.data);

    // The backend should return a streaming URL and initial message
    const transactions = response.data;
    console.log("THE TRANSACTIONS ARE: ", transactions);

    console.log("Successfully fetched transactions", {
      transactions,
    });

    return {
      transactions,
    };
  } catch (error) {
    console.error("Error processing writing sessions:", error);
    throw error;
  }
};
