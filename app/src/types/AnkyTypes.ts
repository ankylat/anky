export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type: "text" | "image" | "audio" | "code";
}

export type PlaygroundMode = "chat" | "image" | "voice" | "code";

export interface AnkyUserInterfaceProps {
  messages: Message[];
  mode: PlaygroundMode;
}
