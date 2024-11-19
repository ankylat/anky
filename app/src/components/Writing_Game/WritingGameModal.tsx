import { useState, useEffect } from "react";
import { View, Text, Animated } from "react-native";
import { useAnky } from "@/src/context/AnkyContext";
import { sendWritingSessionConversationToAnky } from "@/src/app/lib/anky";

interface WritingGameModalProps {
  isVisible: boolean;
  onClose: () => void;
  session_long_string: string;
  message?: string;
}

const WritingGameModal = ({
  isVisible,
  onClose,
  session_long_string,
  message = "just write. stop thinking.",
}: WritingGameModalProps) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const { conversationWithAnky, setConversationWithAnky } = useAnky();

  useEffect(() => {
    if (isVisible) {
      // Send session data to Anky without interrupting writing flow
      const updatedConversation = [
        ...conversationWithAnky,
        session_long_string,
      ];
      setConversationWithAnky(updatedConversation);
      sendWritingSessionConversationToAnky(updatedConversation);

      // Subtle fade in
      Animated.timing(fadeAnim, {
        toValue: 0.3, // More transparent
        duration: 2000,
        useNativeDriver: true,
      }).start();

      // Gentle fade out
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }).start(() => onClose());
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        position: "absolute",
        top: "5%",
        width: "100%",
        pointerEvents: "none",
      }}
    >
      <View className="mx-auto">
        <Text
          className="text-[#9D8CFF] text-lg font-light text-center opacity-50"
          style={{
            textShadowColor: "rgba(157, 140, 255, 0.3)",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

export default WritingGameModal;
