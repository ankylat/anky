import axios from "axios";
import { User } from "../../types/User";
import { Cast } from "../../types/Cast";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;

export const getUserProfile = async (
  fid: string
): Promise<{ user: User; casts: Cast[] }> => {
  console.log(`Attempting to fetch user profile for fid: ${fid}`);
  try {
    let endpoint = `${API_URL}/farcaster/user/${fid}`;
    console.log(`Endpoint constructed: ${endpoint}`);

    console.log("Preparing to make API request");
    const response = await axios.get(endpoint, {
      headers: {
        "api-key": POIESIS_API_KEY!,
        token: "",
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });
    console.log("API request completed");

    console.log(`Response status: ${response.status}`);
    if (response.status !== 200) {
      console.error(`Unexpected response status: ${response.status}`);
      throw new Error("Failed to fetch user profile and casts");
    }

    console.log("Successfully fetched user profile and casts", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user profile or casts:", error);
    throw error;
  }
};
