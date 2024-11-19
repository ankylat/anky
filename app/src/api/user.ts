import axios from "axios";
import { AnkyUser, FarcasterAccount, UserMetadata } from "@/src/types/User";
import { Cast } from "@/src/types/Cast";
import { prettyLog } from "../app/lib/logs";
import { Anky, WritingSession } from "../types/Anky";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
console.log("THE NEYNAR API KEY IS", NEYNAR_API_KEY);

export const getUserProfile = async (
  fid: string
): Promise<FarcasterAccount> => {
  console.log(
    `[getUserProfile] Starting to fetch profile for fid: ${fid}`,
    NEYNAR_API_KEY
  );
  try {
    console.log("[getUserProfile] Constructing request options");
    const options = {
      method: "GET",
      url: `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      headers: {
        accept: "application/json",
        "x-neynar-experimental": "true",
        "x-api-key": "4DF21FD5-FB60-426C-9521-FA2106A7E969",
      },
    };
    console.log("[getUserProfile] Request options:", options);

    console.log("[getUserProfile] Making API request");
    const response = await axios.request(options);
    console.log("[getUserProfile] API response received:", response.status);
    console.log("[getUserProfile] Response data:", response.data);

    console.log("[getUserProfile] Extracting user data");
    const userData = response.data.users[0];
    prettyLog(userData, "THE USER DATA IS");

    return userData;
  } catch (error: any) {
    console.error("[getUserProfile] Error fetching user profile:", error);
    console.error("[getUserProfile] Error details:", {
      message: error.message,
      stack: error.stack,
    });
    throw error; // Re-throw to handle error upstream
  }
};

// export const getUserProfile = async (
//   fid: string
// ): Promise<{ user: AnkyUser; casts: Cast[] }> => {
//   console.log(`Attempting to fetch user profile for fid: ${fid}`);
//   try {
//     let endpoint = `${API_URL}/farcaster/user/${fid}`;
//     console.log(`Endpoint constructed: ${endpoint}`);

//     console.log("Preparing to make API request");
//     const response = await axios.get(endpoint, {
//       headers: {
//         "api-key": POIESIS_API_KEY!,
//         token: "",
//         "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
//       },
//     });
//     console.log("API request completed");

//     console.log(`Response status: ${response.status}`);
//     if (response.status !== 200) {
//       console.error(`Unexpected response status: ${response.status}`);
//       throw new Error("Failed to fetch user profile and casts");
//     }

//     console.log("Successfully fetched user profile and casts", response.data);
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching user profile or casts:", error);
//     const options = {

//     }
//     throw error;
//   }
// };

export const registerAnonUser = async (
  user: AnkyUser
): Promise<{ user: AnkyUser; jwt: string }> => {
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

    return { user: response.data.user, jwt: response.data.jwt };
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

export const getUserAnkys = async (fid: string): Promise<Cast[]> => {
  const endpoint = `${API_URL}/farcaster/user/${fid}/ankys`;
  const response = await axios.get(endpoint);
  return response.data;
};

export const getUserDrafts = async (fid: string): Promise<WritingSession[]> => {
  const endpoint = `${API_URL}/farcaster/user/${fid}/drafts`;
  const response = await axios.get(endpoint);
  return response.data;
};

export const getUserCollectedAnkys = async (fid: string): Promise<Anky[]> => {
  const endpoint = `${API_URL}/farcaster/user/${fid}/collected`;
  const response = await axios.get(endpoint);
  return response.data;
};
