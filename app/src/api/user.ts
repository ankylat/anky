import axios from "axios";
import { User } from "@/src/types/User";
import { Cast } from "@/src/types/Cast";

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

export const registerAnonUser = async (user: User): Promise<User> => {
  console.info("[POST] /users/register-anon-user");
  const endpoint = `${API_URL}/users/register-anon-user`;
  console.log("Endpoint constructed | registering anon user", endpoint, user);

  try {
    const response = await axios.post(endpoint, user, {
      headers: {
        "api-key": POIESIS_API_KEY!,
        token: "",
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });
    console.log("IN HERE, the registered user is", response.data);

    return response.data;
  } catch (err: any) {
    console.error("Error registering anonymous user:", err);
    console.log("The error is", err.response.data);

    if (err.response && err.response.status === 400) {
      throw new Error("token is required in headers");
    }

    if (err.response && err.response.status === 404) {
      throw new Error("no user found with entered token");
    }

    throw new Error("Error getting user info");
  }
};
