/**
 * Chat Suggestions Controller — Quick-Action Chips
 *
 * Returns 3 contextual suggestion strings via a single Groq call.
 * Falls back to default suggestions on any failure.
 *
 * Requirements: 14.2
 */

import groq from "../services/chat/groqClient.js";

/** Default suggestions returned on failure or invalid response */
const DEFAULT_SUGGESTIONS = [
  "What's popular today?",
  "Show me my cart",
  "Track my order",
];

/**
 * POST /api/v1/chat/suggestions — Generate quick-action chip suggestions
 *
 * Body: { context?: string } — optional last assistant message for context
 */
export const getSuggestions = async (req, res) => {
  try {
    const { context } = req.body || {};

    const systemPrompt = `You are a helpful assistant for SwadKart, a food delivery app.
Generate exactly 3 short suggestion messages (max 40 chars each) that a user might want to ask next.
Return ONLY a JSON array of 3 strings. No explanation, no markdown, no code blocks.
Example: ["What's on sale?", "Show my orders", "Recommend something spicy"]`;

    const userPrompt = context && typeof context === "string"
      ? `The last assistant message was: "${context.substring(0, 200)}". Suggest 3 follow-up questions the user might ask.`
      : "Suggest 3 starter questions for a food delivery chatbot.";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const rawContent = completion?.choices?.[0]?.message?.content || "";

    // Parse the JSON array from the response
    const suggestions = parseSuggestions(rawContent);

    return res.json({ suggestions });
  } catch (error) {
    console.error("Chat suggestions error:", error.message);
    // Return defaults on any failure
    return res.json({ suggestions: DEFAULT_SUGGESTIONS });
  }
};

/**
 * Parse and validate the Groq response into an array of 3 strings.
 * Returns DEFAULT_SUGGESTIONS if parsing or validation fails.
 *
 * @param {string} raw - Raw LLM response content
 * @returns {string[]} Array of exactly 3 suggestion strings
 */
function parseSuggestions(raw) {
  try {
    // Try to extract JSON array from the response (handle markdown code blocks)
    let cleaned = raw.trim();

    // Strip markdown code block wrappers if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    // Validate: must be an array of exactly 3 strings
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 3 ||
      !parsed.every((item) => typeof item === "string" && item.trim().length > 0)
    ) {
      return DEFAULT_SUGGESTIONS;
    }

    // Trim each suggestion
    return parsed.map((s) => s.trim());
  } catch {
    return DEFAULT_SUGGESTIONS;
  }
}
