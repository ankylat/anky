import axios from "axios";
import { User } from "../types/User";
import { Cast } from "../types/Cast";
import { User as PrivyUser } from "@privy-io/expo";
import { WritingSession } from "@/src/types/Anky";
import { prettyLog } from "../app/lib/user";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;

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
  } catch (error) {
    console.error("Error adding new session to the database:", error);
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
  } catch (error) {
    console.error("Error updating the session on the database:", error);
    throw error;
  }
};

export const onboardingSessionProcessing = async (
  user_writings: WritingSession[],
  anky_responses: string[]
): Promise<{ reflection: string }> => {
  console.log(`Getting new anky responses`);
  try {
    let endpoint = `${API_URL}/anky/onboarding/${user_writings[0].user_id}`;
    console.log(`Endpoint constructed: ${endpoint}`);
    const user = { access_token: "" };

    console.log("Preparing to make API request");
    prettyLog({ user_writings, anky_responses }, "ONBOARDING SESSION DATA");

    const response = await axios.post(
      endpoint,
      { user_writings, anky_responses },
      {
        headers: {
          "api-key": POIESIS_API_KEY!,
          token: user.access_token,
          "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
        },
      }
    );
    console.log("API request completed");

    prettyLog(response.data, "ANKY RESPONSES");
    if (response.status !== 200) {
      console.error(`Unexpected response status: ${response.status}`);
      throw new Error("Failed to fetch user profile and casts");
    }

    console.log("got new response from anky", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error adding the onboarding session to the database:",
      error
    );
    throw error;
  }
};
