/**
 * Language Detector — Pure Function
 *
 * Detects the language of a given text from the Supported_Language_Set
 * using character-set analysis + keyword scoring.
 *
 * Priority tie-break order: English, Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi
 */

export const SUPPORTED = [
  "English",
  "Hindi",
  "Hinglish",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
];

// Unicode ranges for script detection
const DEVANAGARI_RE = /[\u0900-\u097F]/g;
const TAMIL_RE = /[\u0B80-\u0BFF]/g;
const TELUGU_RE = /[\u0C00-\u0C7F]/g;
const BENGALI_RE = /[\u0980-\u09FF]/g;
const LATIN_RE = /[A-Za-z]/g;

// Hinglish keywords (Latin-script Hindi/Urdu slang commonly used in Indian English)
const HINGLISH_KEYWORDS = [
  "yaar",
  "bhai",
  "kya",
  "bindaas",
  "boss",
  "arre",
  "accha",
  "theek",
  "nahi",
  "haan",
  "kaise",
  "kaisa",
  "kahan",
  "abhi",
  "bahut",
  "acha",
  "matlab",
  "bilkul",
  "sahi",
  "chal",
  "mast",
  "dost",
  "paisa",
  "khana",
  "pani",
  "ghar",
  "kaam",
  "wala",
  "wali",
  "hai",
  "hain",
  "kar",
  "karo",
  "bolo",
  "dekho",
  "sunno",
  "chalo",
  "aaja",
  "jaldi",
  "thoda",
];

// Marathi-specific keywords (Devanagari script shared with Hindi, so keywords differentiate)
const MARATHI_KEYWORDS = [
  "aahe",
  "kasa",
  "majha",
  "tumhi",
  "mala",
  "kay",
  "nahi",
  "ahe",
  "hota",
  "zala",
  "mhanje",
  "pan",
  "tar",
  "ashi",
  "kahi",
  "tyala",
  "tila",
  "amhi",
  "tumcha",
  "mazha",
];

// Hindi-specific keywords (Devanagari)
const HINDI_KEYWORDS = [
  "है",
  "हैं",
  "का",
  "की",
  "के",
  "में",
  "से",
  "को",
  "पर",
  "और",
  "यह",
  "वह",
  "कि",
  "जो",
  "तो",
  "भी",
  "नहीं",
  "हम",
  "मैं",
  "आप",
  "क्या",
  "कैसे",
  "कहाँ",
  "कब",
  "कौन",
];

/**
 * Count keyword matches in text (case-insensitive, word-boundary aware)
 * @param {string} text - Input text
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Count of matched keywords
 */
function countKeywordMatches(text, keywords) {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    // Use simple includes for short keywords, word boundary for longer ones
    const re = new RegExp(`\\b${kw}\\b`, "i");
    if (re.test(lower)) {
      count++;
    }
  }
  return count;
}

/**
 * Detect the language of the given text.
 *
 * @param {string} text - The user message text
 * @returns {{ language: string, score: number }} The detected language and its score
 */
export function detectLanguage(text) {
  // Handle empty/whitespace-only input → English with score 0
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { language: "English", score: 0 };
  }

  const scores = {};

  // Count characters in each script
  const devanagariCount = (text.match(DEVANAGARI_RE) || []).length;
  const tamilCount = (text.match(TAMIL_RE) || []).length;
  const teluguCount = (text.match(TELUGU_RE) || []).length;
  const bengaliCount = (text.match(BENGALI_RE) || []).length;
  const latinCount = (text.match(LATIN_RE) || []).length;

  const totalChars = text.replace(/\s/g, "").length || 1;

  // Character-set scoring (normalized to 0-10 scale)
  const devanagariScore = (devanagariCount / totalChars) * 10;
  const tamilScore = (tamilCount / totalChars) * 10;
  const teluguScore = (teluguCount / totalChars) * 10;
  const bengaliScore = (bengaliCount / totalChars) * 10;
  const latinScore = (latinCount / totalChars) * 10;

  // English: high Latin, no Hinglish keywords
  const hinglishKeywordCount = countKeywordMatches(text, HINGLISH_KEYWORDS);
  const marathiKeywordCount = countKeywordMatches(text, MARATHI_KEYWORDS);
  const hindiKeywordCount = countKeywordMatches(text, HINDI_KEYWORDS);

  // English score: Latin chars minus Hinglish keyword penalty
  scores["English"] = latinScore - hinglishKeywordCount * 0.5;

  // Hindi score: Devanagari chars + Hindi keywords
  scores["Hindi"] = devanagariScore + hindiKeywordCount * 0.3;

  // Hinglish score: Latin chars + Hinglish keywords (mixed language)
  scores["Hinglish"] =
    latinCount > 0 && hinglishKeywordCount > 0
      ? latinScore * 0.5 + hinglishKeywordCount * 1.5
      : 0;

  // Tamil score: Tamil script chars
  scores["Tamil"] = tamilScore;

  // Telugu score: Telugu script chars
  scores["Telugu"] = teluguScore;

  // Bengali score: Bengali script chars
  scores["Bengali"] = bengaliScore;

  // Marathi score: Devanagari chars + Marathi keywords (differentiate from Hindi)
  scores["Marathi"] =
    devanagariCount > 0 && marathiKeywordCount > 0
      ? devanagariScore * 0.7 + marathiKeywordCount * 1.5
      : devanagariCount > 0 && marathiKeywordCount > 0
        ? devanagariScore * 0.5
        : 0;

  // Find the maximum score, using priority order for tie-breaking
  let bestLanguage = "English";
  let bestScore = 0;

  for (const lang of SUPPORTED) {
    const s = scores[lang] || 0;
    if (s > bestScore) {
      bestScore = s;
      bestLanguage = lang;
    }
    // Tie-break: priority order (first in SUPPORTED array wins)
    // Since we iterate in priority order and use strict >, the first one wins ties
  }

  // If all scores are 0 or negative, default to English
  if (bestScore <= 0) {
    return { language: "English", score: 0 };
  }

  return { language: bestLanguage, score: bestScore };
}
