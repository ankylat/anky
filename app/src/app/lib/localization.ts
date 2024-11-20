import i18n, { ModuleType } from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

// Define translations for each language
const translations = {
  en: {
    prompt: "tell me who you are",
  },
  zh: {
    prompt: "告诉我你是谁",
  },
  hi: {
    prompt: "मुझे बताओ तुम कौन हो",
  },
  es: {
    prompt: "dime quién eres",
  },
  ar: {
    prompt: "أخبرني من أنت",
  },
  bn: {
    prompt: "আমাকে বলো তুমি কে",
  },
  pt: {
    prompt: "diga-me quem você é",
  },
  ru: {
    prompt: "скажи мне, кто ты",
  },
  ja: {
    prompt: "あなたは誰か教えてください",
  },
  pa: {
    prompt: "ਮੈਨੂੰ ਦੱਸੋ ਤੁਸੀਂ ਕੌਣ ਹੋ",
  },
  de: {
    prompt: "sag mir wer du bist",
  },
  jv: {
    prompt: "kandha karo sopo kowé",
  },
  ko: {
    prompt: "당신이 누구인지 말해주세요",
  },
  fr: {
    prompt: "dis-moi qui tu es",
  },
  te: {
    prompt: "నువ్వు ఎవరో చెప్పు",
  },
  mr: {
    prompt: "मला सांग तू कोण आहेस",
  },
  tr: {
    prompt: "bana kim olduğunu söyle",
  },
  ta: {
    prompt: "நீ யார் என்று சொல்",
  },
  vi: {
    prompt: "hãy cho tôi biết bạn là ai",
  },
  it: {
    prompt: "dimmi chi sei",
  },
};

// Language detector to get device language
const languageDetector = {
  type: "languageDetector" as ModuleType,
  async: true,
  detect: async (callback: any) => {
    const phoneLanguage = getLocales()[0].languageCode;
    return callback(phoneLanguage);
  },
  init: () => {},
};

// Initialize i18n
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: translations,
    compatibilityJSON: "v3",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export const getLocalizedPrompt = (): string => {
  return i18n.t("prompt");
};

export default i18n;
