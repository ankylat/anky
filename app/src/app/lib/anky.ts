import { sendWritingConversationToAnky } from "@/src/api/anky";
import { prettyLog } from "./logs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Anky, WritingSession } from "@/src/types/Anky";

export async function sendWritingSessionConversationToAnky(
  conversation_so_far: string[]
): Promise<string> {
  try {
    prettyLog(conversation_so_far, "the conversation so far is");

    console.log("sending the conversation to anky");

    const new_prompt = await sendWritingConversationToAnky(conversation_so_far);
    prettyLog(new_prompt, "the anky response is NEW PROMPT:");

    console.log("Successfully processed writing session", new_prompt);
    return new_prompt;
  } catch (error) {
    console.error("Error processing writing session:", error);
    throw error;
  }
}

export function extractSessionDataFromLongString(session_long_string: string): {
  user_id: string;
  session_id: string;
  prompt: string;
  starting_timestamp: number;
  session_text: string;
  total_time_written: number;
  word_count: number;
  average_wpm: number;
} {
  console.log("Extracting session data from long string:", session_long_string);

  const lines = session_long_string.split("\n");
  const user_id = lines[0];
  const session_id = lines[1];
  const prompt = lines[2];
  const starting_timestamp = parseInt(lines[3]);

  console.log("Initial data:", {
    user_id,
    session_id,
    prompt,
    starting_timestamp,
  });

  // Process typing data starting from line 4
  let session_text = "";
  let total_time = 0;

  for (let i = 4; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const [char, timeStr] = lines[i].split(/\s+/);
    const time = parseInt(timeStr);

    console.log(`Processing character at line ${i}:`, { char, time });

    // Handle backspace
    if (char === "Backspace") {
      session_text = session_text.slice(0, -1);
      console.log("Backspace pressed, new text:", session_text);
    }
    // Handle special characters
    else if (char === "Space" || char === "") {
      session_text += " ";
      console.log("Space pressed, new text:", session_text);
    } else if (char === "Enter") {
      session_text += "\n";
      console.log("Enter pressed, new text:", session_text);
    }
    // Handle regular characters
    else if (char.length === 1) {
      session_text += char;
      console.log("Character added, new text:", session_text);
    }

    total_time += time;
    console.log("Running total time:", total_time);
  }

  // Filter out multiple consecutive spaces and trim
  session_text = session_text.replace(/\s+/g, " ").trim();

  const word_count = session_text
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  // Calculate average time between keystrokes
  const avgKeystrokeTime = total_time / session_text.length; // ms per keystroke

  // Estimate chars per minute based on keystroke timing
  const estimatedCharsPerMin = 60000 / avgKeystrokeTime; // chars per minute

  // Assume average word length of 5 characters
  const projectedWordsPerMin = estimatedCharsPerMin / 5;

  // Calculate actual WPM for this session
  const actualWpm = word_count / (total_time / 60000);

  // Take weighted average of projected and actual WPM
  // Weight actual WPM more heavily for longer sessions
  const weightForActual = Math.min(0.8, total_time / 300000); // Max 80% weight after 5 mins
  const average_wpm = Number(
    (
      actualWpm * weightForActual +
      projectedWordsPerMin * (1 - weightForActual)
    ).toFixed(2)
  );

  // Add 8 seconds (8000ms) as per requirement
  const total_time_written = total_time + 8000;

  const result = {
    user_id,
    session_id,
    prompt,
    starting_timestamp,
    session_text,
    total_time_written,
    word_count,
    average_wpm,
  };

  console.log("Final extracted session data:", result);
  return result;
}

export async function getAllUserWrittenAnkysFromLocalStorage(): Promise<
  string[]
> {
  try {
    const allUserWrittenAnkys = await AsyncStorage.getItem(
      "all_user_written_ankys"
    );
    if (!allUserWrittenAnkys) return [];
    return JSON.parse(allUserWrittenAnkys);
  } catch (error) {
    console.error("Error getting all user written ankys:", error);
    return [];
  }
}

export async function updateAllUserWrittenAnkysOnLocalStorage(
  new_writing_session_long_string: string
) {
  const allUserWrittenAnkys = await getAllUserWrittenAnkysFromLocalStorage();
  const newAnkys = [...allUserWrittenAnkys, new_writing_session_long_string];
  await AsyncStorage.setItem(
    "all_user_written_ankys",
    JSON.stringify(newAnkys)
  );
}
