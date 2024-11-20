import axios from "axios";
import { Cast } from "../types/Cast";
import { User as PrivyUser } from "@privy-io/expo";
import { WritingSession } from "@/src/types/Anky";
import { prettyLog } from "../app/lib/logs";
import {
  EXPO_PUBLIC_ANKY_API_URL,
  EXPO_PUBLIC_POIESIS_API_KEY,
} from "@/dotenv";

const API_URL = EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = EXPO_PUBLIC_POIESIS_API_KEY;

export const startWritingSession = async (
  writingSession: WritingSession,
  accessToken: string
): Promise<{ writingSession: WritingSession }> => {
  prettyLog(writingSession, "STARTING A NEW WRITING SESSION");
  try {
    let endpoint = `${API_URL}/writing-session-started`;
    console.log(`Endpoint constructed: ${endpoint}`);

    console.log("Preparing to make API request");
    const response = await axios.post(endpoint, writingSession, {
      headers: {
        "api-key": POIESIS_API_KEY!,
        token: accessToken || "",
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });
    console.log("API request completed");

    console.log(`Response status: ${response.status}`);
    if (response.status !== 200) {
      console.error(`Unexpected response status: ${response.status}`);
      throw new Error("Failed to fetch user profile and casts");
    }

    console.log(
      "Successfully added new session to the database",
      response.data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error adding new session to the database:", error);
    console.log("The error is", error.response);
    throw error;
  }
};

export const endWritingSession = async (
  writingSession: WritingSession,
  accessToken: string
): Promise<{ writingSession: WritingSession }> => {
  console.log(
    `Adding new writing session to the database and sending to backend`
  );

  try {
    let endpoint = `${API_URL}/writing-session-ended`;
    console.log(`Endpoint constructed: ${endpoint}`);

    console.log("Preparing to make API request");
    prettyLog(writingSession, "ENDING WRITING SESSION");
    const response = await axios.post(endpoint, writingSession, {
      headers: {
        "api-key": POIESIS_API_KEY!,
        token: accessToken || "",
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });
    console.log("API request completed");

    console.log(`Response status: ${response.status}`);
    if (response.status !== 200) {
      console.error(`Unexpected response status: ${response.status}`);
      throw new Error("Failed to fetch user profile and casts");
    }

    console.log(
      "Successfully updated the ended session on the database",
      response.data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating the session on the database:", error);
    console.log("The error is", error.response);
    throw error;
  }
};
