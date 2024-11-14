import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from "@react-native-voice/voice";
import { Platform } from "react-native";

interface VoiceConfig {
  language: string;
  continuous: boolean;
  onPartialResult?: (text: string) => void;
  onResult: (text: string) => void;
  onError: (error: string) => void;
}

class VoiceRecognitionManager {
  private isListening: boolean = false;
  private language: string;
  private continuous: boolean;
  private onPartialResult?: (text: string) => void;
  private onResult: (text: string) => void;
  private onError: (error: string) => void;

  constructor(config: VoiceConfig) {
    this.language = config.language;
    this.continuous = config.continuous;
    this.onPartialResult = config.onPartialResult;
    this.onResult = config.onResult;
    this.onError = config.onError;

    this.setupVoiceRecognition();
  }

  private setupVoiceRecognition() {
    Voice.onSpeechStart = () => {
      this.isListening = true;
    };

    Voice.onSpeechEnd = () => {
      this.isListening = false;
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (this.onPartialResult && e.value) {
        this.onPartialResult(e.value[0]);
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value) {
        this.onResult(e.value[0]);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      this.isListening = false;
      this.onError(e.error?.message || "Unknown error");
    };
  }

  async startListening() {
    try {
      await Voice.start(this.language);
    } catch (error) {
      this.onError("Failed to start voice recognition");
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
    } catch (error) {
      this.onError("Failed to stop voice recognition");
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
    } catch (error) {
      console.error("Failed to destroy voice recognition:", error);
    }
  }

  isRecognizing() {
    return this.isListening;
  }
}

export const createVoiceRecognition = (config: VoiceConfig) => {
  return new VoiceRecognitionManager(config);
};
