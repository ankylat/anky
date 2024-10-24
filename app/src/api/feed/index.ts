import axios from "axios";
import { Cast } from "../../types/Cast";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;

// TODO: Add this endpoint on the backend
export const getLandingFeed = async (fid: number = 18350): Promise<Cast[]> => {
  try {
    let endpoint = `${API_URL}/user-casts/18350`;

    const response = await axios.get(endpoint, {
      headers: {
        "api-key": process.env.POIESIS_API_KEY!,
        token: "", // this endpoint is only called when the user in not logged in
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });

    if (response.status !== 200) {
      throw new Error("Failed to fetch feed");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching landing feed:", error);
    throw error;
  }
};

// TODO: Add this endpoint on the backend
export const getCast = async (
  hash: string,
  userToken: string
): Promise<Cast> => {
  try {
    let endpoint = `${API_URL}/farcaster/cast/${hash}`;
    const response = await axios.get(endpoint, {
      headers: {
        "api-key": process.env.POIESIS_API_KEY!,
        token: userToken,
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching cast:", error);
    throw error;
  }
};
