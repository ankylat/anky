import { useState, useEffect } from "react";

export const useTextStream = (text: string, speed: number = 44) => {
  const [displayedText, setDisplayedText] = useState("");
  const [streamEnded, setStreamEnded] = useState(false);

  useEffect(() => {
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(timer);
        setStreamEnded(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text]);

  return { displayedText, streamEnded };
};
