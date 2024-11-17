import { getLocales } from "expo-localization";

const translations = [
  { code: "en", prompt: "tell me who you are" },
  { code: "zh", prompt: "告诉我你是谁" },
  { code: "hi", prompt: "मुझे बताओ तुम कौन हो" },
  { code: "es", prompt: "dime quién eres" },
  { code: "ar", prompt: "أخبرني من أنت" },
  { code: "bn", prompt: "আমাকে বলো তুমি কে" },
  { code: "pt", prompt: "diga-me quem você é" },
  { code: "ru", prompt: "скажи мне, кто ты" },
  { code: "ja", prompt: "あなたは誰か教えてください" },
  { code: "pa", prompt: "ਮੈਨੂੰ ਦੱਸੋ ਤੁਸੀਂ ਕੌਣ ਹੋ" },
  { code: "de", prompt: "sag mir wer du bist" },
  { code: "jv", prompt: "kandha karo sopo kowé" },
  { code: "ko", prompt: "당신이 누구인지 말해주세요" },
  { code: "fr", prompt: "dis-moi qui tu es" },
  { code: "te", prompt: "నువ్వు ఎవరో చెప్పు" },
  { code: "mr", prompt: "मला सांग तू कोण आहेस" },
  { code: "tr", prompt: "bana kim olduğunu söyle" },
  { code: "ta", prompt: "நீ யார் என்று சொல்" },
  { code: "vi", prompt: "hãy cho tôi biết bạn là ai" },
  { code: "it", prompt: "dimmi chi sei" },
];

export const getLocalizedPrompt = (): string => {
  const userLanguage = getLocales()[0].languageCode;
  const translation = translations.find((t) => t.code === userLanguage);
  return translation?.prompt || translations[0].prompt;
};

export default translations;
