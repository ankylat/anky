import { Anky, WritingSession } from "@/src/types/Anky";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { encodeToAnkyverseLanguage } from "../app/lib/ankyverse";

export async function shareAnkyWritingSessionAsCast(
  writingSession: WritingSession
) {
  try {
    throw new Error("Not implemented");
    const signer_uuid = await AsyncStorage.getItem("signer_uuid");
    const random_ticker = Math.random().toString(36).substring(2, 18);
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY as string,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        signer_uuid: signer_uuid,
        text:
          encodeToAnkyverseLanguage(writingSession.session_id || "") +
          `@clanker $${random_ticker} you decide the name`,
        embeds: [
          {
            url: `https://poiesis.anky.bot/generated-anky-on-frame/${writingSession.session_id}`,
          },
        ],
      }),
    };

    const response = await fetch(
      "https://api.neynar.com/v2/farcaster/cast",
      options
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.cast;
  } catch (error) {
    console.error("Error sharing writing session:", error);
    throw error;
  }
}
