import { sendWritingStringToAnky } from "@/src/api/anky";
import { prettyLog } from "./logs";

export async function sendWritingSessionToAnky(sessionLongString: string) {
  try {
    console.log("Starting to process writing session...");
    prettyLog(sessionLongString, "the session long string is");
    console.log("Session string length:", sessionLongString.length);

    // Split the string into lines
    const lines = sessionLongString.split("\n");
    console.log("Number of lines:", lines.length);
    console.log("THE LINES ARE: ", lines);

    // Extract the basic session info from first 3 lines
    const userId = lines[0];
    const sessionId = lines[1];
    const prompt = lines[2];
    const startingTimestamp = parseInt(lines[3]);
    console.log("THE STARTING TIMESTAMP IS: ", startingTimestamp);
    console.log("Session ID:", sessionId);
    console.log("Prompt:", prompt);
    console.log("User ID:", userId);
    console.log(
      "Starting timestamp:",
      new Date(startingTimestamp).toISOString()
    );

    // Process the keystrokes starting from line 3
    const keystrokes = lines
      .slice(3)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [key, delta] = line.trim().split(" ");
        return {
          key,
          delta: parseInt(delta),
        };
      });
    console.log("Number of keystrokes:", keystrokes.length);

    // Calculate some useful metrics
    const totalTime = keystrokes.reduce((sum, stroke) => sum + stroke.delta, 0);
    const characterCount = keystrokes.filter((k) => k.key.length === 1).length;
    const backspaces = keystrokes.filter((k) => k.key === "Backspace").length;
    const spaces = keystrokes.filter((k) => k.key === " ").length;
    const wordCount = spaces + 1; // Rough estimate of word count based on spaces

    console.log("Session metrics:", {
      totalTimeMs: totalTime,
      characterCount,
      backspaces,
      wordCount,
      averageTimeBetweenKeystrokes:
        keystrokes.reduce((sum, stroke) => sum + stroke.delta, 0) /
        keystrokes.length,
    });

    const response = await sendWritingStringToAnky(sessionLongString);
    console.log("Anky response:", response);

    // Construct the processed session data
    const processedSession = {
      sessionId,
      prompt,
      startingTimestamp,
      metrics: {
        totalTimeMs: totalTime,
        characterCount,
        backspaces,
        wordCount,
        averageTimeBetweenKeystrokes:
          keystrokes.reduce((sum, stroke) => sum + stroke.delta, 0) /
          keystrokes.length,
      },
      keystrokes,
    };

    console.log("Successfully processed writing session");
    return processedSession;
  } catch (error) {
    console.error("Error processing writing session:", error);
    throw error;
  }
}
