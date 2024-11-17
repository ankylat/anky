#!/bin/bash

mkdir -p ./src/locales

echo '{"self-inquiry": {"upcoming_prompt": "tell me who you are"}}' > ./src/locales/en.json
echo '{"self-inquiry": {"upcoming_prompt": "告诉我你是谁"}}' > ./src/locales/zh.json
echo '{"self-inquiry": {"upcoming_prompt": "मुझे बताओ तुम कौन हो"}}' > ./src/locales/hi.json
echo '{"self-inquiry": {"upcoming_prompt": "dime quién eres"}}' > ./src/locales/es.json
echo '{"self-inquiry": {"upcoming_prompt": "أخبرني من أنت"}}' > ./src/locales/ar.json
echo '{"self-inquiry": {"upcoming_prompt": "আমাকে বলো তুমি কে"}}' > ./src/locales/bn.json
echo '{"self-inquiry": {"upcoming_prompt": "diga-me quem você é"}}' > ./src/locales/pt.json
echo '{"self-inquiry": {"upcoming_prompt": "скажи мне, кто ты"}}' > ./src/locales/ru.json
echo '{"self-inquiry": {"upcoming_prompt": "あなたは誰か教えてください"}}' > ./src/locales/ja.json
echo '{"self-inquiry": {"upcoming_prompt": "ਮੈਨੂੰ ਦੱਸੋ ਤੁਸੀਂ ਕੌਣ ਹੋ"}}' > ./src/locales/pa.json
echo '{"self-inquiry": {"upcoming_prompt": "sag mir wer du bist"}}' > ./src/locales/de.json
echo '{"self-inquiry": {"upcoming_prompt": "kandha karo sopo kowé"}}' > ./src/locales/jv.json
echo '{"self-inquiry": {"upcoming_prompt": "당신이 누구인지 말해주세요"}}' > ./src/locales/ko.json
echo '{"self-inquiry": {"upcoming_prompt": "dis-moi qui tu es"}}' > ./src/locales/fr.json
echo '{"self-inquiry": {"upcoming_prompt": "నువ్వు ఎవరో చెప్పు"}}' > ./src/locales/te.json
echo '{"self-inquiry": {"upcoming_prompt": "मला सांग तू कोण आहेस"}}' > ./src/locales/mr.json
echo '{"self-inquiry": {"upcoming_prompt": "bana kim olduğunu söyle"}}' > ./src/locales/tr.json
echo '{"self-inquiry": {"upcoming_prompt": "நீ யார் என்று சொல்"}}' > ./src/locales/ta.json
echo '{"self-inquiry": {"upcoming_prompt": "hãy cho tôi biết bạn là ai"}}' > ./src/locales/vi.json
echo '{"self-inquiry": {"upcoming_prompt": "dimmi chi sei"}}' > ./src/locales/it.json

echo "all locale files have been created in src/locales!"