import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { User as PrivyUser } from "@privy-io/expo";

interface WritingSession {
  id: string;
  text: string;
  timeSpent: number;
  timestamp: string;
  isAnky: boolean;
  ankyImageUrl?: string;
  ankyResponse?: string; // Added field for Anky's response
}

// Function to send writing to Anky and process the response
async function sendWritingToAnky(
  text: string,
  user: PrivyUser
): Promise<{ imageUrl: string; response: string }> {
  const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;

  try {
    const response = await axios.post(`${API_URL}/process-writing`, {
      writing: text,
      user: user,
      // TODO for backend: Ensure proper authentication and authorization
    });

    return {
      imageUrl: response.data.imageUrl,
      response: response.data.ankyResponse,
    };
  } catch (error) {
    console.error("Error sending writing to Anky:", error);
    throw error;
  }
}

export async function processWritingSession(
  text: string,
  timeSpent: number,
  user: PrivyUser
) {
  const sessionId = uuidv4();
  const isAnky = timeSpent >= 480; // 8 minutes or more
  const timestamp = new Date().toISOString();

  const writingSession: WritingSession = {
    id: sessionId,
    text,
    timeSpent,
    timestamp,
    isAnky,
  };

  // Save the writing session to local storage
  try {
    const existingSessions = await AsyncStorage.getItem("writingSessions");
    const sessions: WritingSession[] = existingSessions
      ? JSON.parse(existingSessions)
      : [];
    sessions.push(writingSession);
    await AsyncStorage.setItem("writingSessions", JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving writing session:", error);
  }

  // If it's an Anky session, process it further
  if (isAnky) {
    try {
      // Send the text to Anky and get the image URL and response
      const ankyResponse = await sendWritingToAnky(text, user);
      writingSession.ankyImageUrl = ankyResponse.imageUrl;
      writingSession.ankyResponse = ankyResponse.response;

      // Update the session in storage with the image URL and Anky's response
      const existingSessions = await AsyncStorage.getItem("writingSessions");
      if (existingSessions) {
        const sessions: WritingSession[] = JSON.parse(existingSessions);
        const updatedSessions = sessions.map((session) =>
          session.id === sessionId ? writingSession : session
        );
        await AsyncStorage.setItem(
          "writingSessions",
          JSON.stringify(updatedSessions)
        );
      }

      // Update user's profile with the new Anky session
      await updateUserProfile(writingSession);

      // TODO for backend:
      // 1. Store the writing session in the database
      // 2. Associate the session with the user
      // 3. Store the generated image URL
      // 4. Store Anky's response
      // 5. Implement proper error handling and retries
      // 6. Consider implementing a queue system for processing long writings
      // 7. Ensure data consistency between frontend and backend
    } catch (error) {
      console.error("Error processing Anky session:", error);
    }
  }

  return writingSession;
}

async function updateUserProfile(session: WritingSession) {
  try {
    const userProfile = await AsyncStorage.getItem("userProfile");
    if (userProfile) {
      const profile = JSON.parse(userProfile);
      if (!profile.ankySessions) {
        profile.ankySessions = [];
      }
      profile.ankySessions.push({
        id: session.id,
        timestamp: session.timestamp,
        imageUrl: session.ankyImageUrl,
        response: session.ankyResponse,
      });
      await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
  }
}
