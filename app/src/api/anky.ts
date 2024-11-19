import axios from "axios";
import { WritingSession } from "../types/Anky";
import { prettyLog } from "../app/lib/logs";

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

export const sendWritingConversationToAnky = async (
  conversation_so_far: string[]
): Promise<string> => {
  try {
    console.log("****************************************************");
    console.log("****************************************************");
    console.log("****************************************************");
    console.log("****************************************************");
    prettyLog(conversation_so_far, "the conversation so far is");
    console.log("****************************************************");
    console.log("****************************************************");
    console.log("****************************************************");
    console.log("****************************************************");
    const endpoint = `${API_URL}/anky/process-writing-conversation`;
    console.log("sending the conversation to anky", endpoint);
    const response = await axios.post(
      endpoint,
      { conversation_so_far },
      {
        headers: {
          "api-key": POIESIS_API_KEY!,
          token: "",
          "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
        },
      }
    );
    console.log("the response is", response);

    if (response.status !== 200) {
      console.error("Failed to send writing string:", response.status);
      throw new Error("Failed to send writing string");
    }
    prettyLog(response.data, "the response data is:");
    return response.data.prompt;
  } catch (error) {
    console.error("Error sending writing string:", error);
    throw error;
  }
};
