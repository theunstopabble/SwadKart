/**
 * FAQ Tool — Returns static FAQ answers for common support queries.
 *
 * This tool does NOT require authentication and makes NO database calls.
 * It uses an in-memory static map for sub-100ms response times.
 * The LLM handles translation of the English responses into the user's
 * detected language.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Static FAQ dataset with pre-written English answers.
 * Each entry contains the topic key and a human-readable answer.
 */
const FAQ_DATA = {
  helpline: {
    topic: "helpline",
    answer:
      "You can reach SwadKart support at 1800-XXX-XXXX (toll-free, 9 AM - 9 PM IST) or email support@swadkart.com.",
  },
  refund_policy: {
    topic: "refund_policy",
    answer:
      "Refunds are processed within 5-7 business days for prepaid orders. COD orders cancelled before dispatch get no refund. Partial refunds apply for partially delivered orders.",
  },
  delivery_areas: {
    topic: "delivery_areas",
    answer:
      "SwadKart currently delivers in major metro cities: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, and Pune. Check the app for pin code availability.",
  },
  payment_methods: {
    topic: "payment_methods",
    answer:
      "We accept UPI, credit/debit cards, net banking, wallets (Paytm, PhonePe), and Cash on Delivery (COD).",
  },
  order_issues: {
    topic: "order_issues",
    answer:
      "For missing items, wrong orders, or quality issues, please contact support within 24 hours of delivery. You can also use the 'Report Issue' button on your order page.",
  },
  account_help: {
    topic: "account_help",
    answer:
      "To reset your password, use the 'Forgot Password' link on the login page. For account deletion or data requests, email privacy@swadkart.com.",
  },
};

export const toolSchema = {
  type: "function",
  function: {
    name: "faq_support",
    description:
      "Get instant answers to common support questions about SwadKart.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "helpline",
            "refund_policy",
            "delivery_areas",
            "payment_methods",
            "order_issues",
            "account_help",
          ],
          description: "The FAQ topic to look up.",
        },
      },
      required: ["topic"],
    },
  },
};

/**
 * Execute the FAQ lookup. Synchronous — no database calls, no authentication.
 *
 * @param {object} params
 * @param {string} params.topic - FAQ topic key
 * @returns {object} Structured result with FAQ answer or invalid_topic error
 */
export function execute({ topic }) {
  if (!Object.hasOwn(FAQ_DATA, topic)) {
    return {
      success: false,
      reason: "invalid_topic",
      message:
        "Topic not recognized. Please try: helpline, refund_policy, delivery_areas, payment_methods, order_issues, or account_help.",
    };
  }

  const entry = FAQ_DATA[topic];

  return {
    success: true,
    data: {
      topic: entry.topic,
      answer: entry.answer,
    },
  };
}
