/**
 * Fallback Responder
 *
 * Returns a static, language-aware reply (≤500 chars) with degraded-mode flag
 * when the LLM provider is unreachable, rate-limited, or returns an error.
 *
 * Validates: Requirements 12.3, 12.4
 */

export const STATIC = {
  English:
    "Sorry, our assistant is temporarily unavailable. Please try again in a moment. " +
    "In the meantime, you can browse our menu at /menu, check your cart at /cart, " +
    "or reach us at swadkartt@gmail.com. We apologize for the inconvenience!",

  Hindi:
    "क्षमा करें, हमारा सहायक अभी अस्थायी रूप से अनुपलब्ध है। कृपया कुछ देर बाद पुनः प्रयास करें। " +
    "इस बीच, आप हमारा मेनू /menu पर देख सकते हैं, अपना कार्ट /cart पर जाँच सकते हैं, " +
    "या swadkartt@gmail.com पर हमसे संपर्क कर सकते हैं। असुविधा के लिए खेद है!",

  Hinglish:
    "Arre sorry! Hamara assistant abhi thoda busy hai. Please thodi der baad try karo. " +
    "Tab tak aap menu dekh sakte ho /menu pe, cart check kar sakte ho /cart pe, " +
    "ya humein mail karo swadkartt@gmail.com pe. Inconvenience ke liye maafi!",

  Tamil:
    "மன்னிக்கவும், எங்கள் உதவியாளர் தற்போது தற்காலிகமாக கிடைக்கவில்லை. " +
    "சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும். இதற்கிடையில், /menu இல் எங்கள் மெனுவைப் பாருங்கள், " +
    "/cart இல் உங்கள் கார்ட்டைச் சரிபாருங்கள், அல்லது swadkartt@gmail.com இல் எங்களைத் தொடர்பு கொள்ளுங்கள்.",

  Telugu:
    "క్షమించండి, మా సహాయకుడు ప్రస్తుతం తాత్కాలికంగా అందుబాటులో లేరు. " +
    "దయచేసి కొద్దిసేపట్లో మళ్ళీ ప్రయత్నించండి. ఈలోగా, /menu లో మెనూ చూడండి, " +
    "/cart లో మీ కార్ట్ తనిఖీ చేయండి, లేదా swadkartt@gmail.com కు మాకు మెయిల్ చేయండి.",

  Bengali:
    "দুঃখিত, আমাদের সহায়ক এই মুহূর্তে সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন। " +
    "এদিকে, /menu তে আমাদের মেনু দেখুন, /cart এ আপনার কার্ট চেক করুন, " +
    "অথবা swadkartt@gmail.com এ আমাদের সাথে যোগাযোগ করুন।",

  Marathi:
    "माफ करा, आमचा सहाय्यक सध्या तात्पुरता अनुपलब्ध आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा. " +
    "तोपर्यंत, /menu वर आमचा मेनू पहा, /cart वर तुमचे कार्ट तपासा, " +
    "किंवा swadkartt@gmail.com वर आम्हाला संपर्क करा. गैरसोयीबद्दल क्षमस्व!",
};

/**
 * Build a fallback response in the user's detected language.
 * Falls back to English if the language is not recognized.
 *
 * @param {string} language - Detected language from the Supported_Language_Set
 * @returns {{ reply: string, degraded: true }}
 */
export function buildFallback(language) {
  const reply = Object.hasOwn(STATIC, language) ? STATIC[language] : STATIC.English;
  return {
    reply,
    degraded: true,
  };
}
