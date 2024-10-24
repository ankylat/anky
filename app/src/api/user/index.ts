import axios from "axios";
import { User } from "../../types/User";
import { Cast } from "../../types/Cast";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;

export const getUserProfile = async (
  fid: string
): Promise<{ user: User; casts: Cast[] }> => {
  try {
    let endpoint = `${API_URL}/user-profile/${fid}`;

    const response = await axios.get(endpoint, {
      headers: {
        "api-key": POIESIS_API_KEY!,
        token: "",
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });

    if (response.status !== 200) {
      throw new Error("Failed to fetch user profile and casts");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching user profile or casts:", error);
    throw error;
  }
};
