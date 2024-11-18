import axios from "axios";
import { WritingSession } from "../types/Anky";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;

export const processInitialWritingSessions = async (
  writingSessions: WritingSession[],
  user_id: string
): Promise<{ message: string; streamUrl: string }> => {
  console.log(
    "Processing initial writing sessions for user analysis",
    writingSessions
  );
  try {
    const endpoint = `${API_URL}/anky/onboarding`;

    const response = await axios.post(
      endpoint,
      { writingSessions, user_id },
      {
        headers: {
          "api-key": POIESIS_API_KEY!,
          token: "",
          "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
        },
      }
    );

    if (response.status !== 200) {
      console.error("Failed to process writing sessions:", response.status);
      throw new Error("Failed to process writing sessions");
    }

    // The backend should return a streaming URL and initial message
    const { message, streamUrl } = response.data;

    console.log("Successfully processed writing sessions", {
      message,
      streamUrl,
    });

    return {
      message,
      streamUrl,
    };
  } catch (error) {
    console.error("Error processing writing sessions:", error);
    throw error;
  }
};

export const sendWritingStringToAnky = async (
  writingString: string
): Promise<{ message: string; streamUrl: string }> => {
  console.log("Sending writing string to Anky", { writingString });
  try {
    const endpoint = `${API_URL}/anky/raw-writing-session`;

    const response = await axios.post(
      endpoint,
      { writingString },
      {
        headers: {
          "api-key": POIESIS_API_KEY!,
          token: "",
          "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
        },
      }
    );

    if (response.status !== 200) {
      console.error("Failed to send writing string:", response.status);
      throw new Error("Failed to send writing string");
    }

    const { message, streamUrl, response: ankyResponse } = response.data;

    console.log("Successfully sent writing string", {
      message,
      streamUrl,
    });

    return {
      message,
      streamUrl,
    };
  } catch (error) {
    console.error("Error sending writing string:", error);
    throw error;
  }
};
