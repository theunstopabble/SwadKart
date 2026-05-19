/**
 * Unit tests for faqTool.js
 *
 * Tests that each valid FAQ topic returns the expected content structure,
 * and that invalid topics return the appropriate error response.
 *
 * **Validates: Requirements 5.2, 5.4**
 */

import { execute, toolSchema } from "../../services/chat/tools/faqTool.js";

describe("faqTool", () => {
  describe("toolSchema", () => {
    it("should have the correct Groq-compatible schema structure", () => {
      expect(toolSchema.type).toBe("function");
      expect(toolSchema.function.name).toBe("faq_support");
      expect(toolSchema.function.parameters.type).toBe("object");
      expect(toolSchema.function.parameters.properties.topic.enum).toEqual([
        "helpline",
        "refund_policy",
        "delivery_areas",
        "payment_methods",
        "order_issues",
        "account_help",
      ]);
      expect(toolSchema.function.parameters.required).toEqual(["topic"]);
    });
  });

  describe("execute - valid topics", () => {
    it("should return success with helpline content", () => {
      const result = execute({ topic: "helpline" });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe("helpline");
      expect(typeof result.data.answer).toBe("string");
      expect(result.data.answer.length).toBeGreaterThan(0);
    });

    it("should return success with refund_policy content", () => {
      const result = execute({ topic: "refund_policy" });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe("refund_policy");
      expect(typeof result.data.answer).toBe("string");
      expect(result.data.answer.length).toBeGreaterThan(0);
    });

    it("should return success with delivery_areas content", () => {
      const result = execute({ topic: "delivery_areas" });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe("delivery_areas");
      expect(typeof result.data.answer).toBe("string");
      expect(result.data.answer.length).toBeGreaterThan(0);
    });

    it("should return success with payment_methods content", () => {
      const result = execute({ topic: "payment_methods" });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe("payment_methods");
      expect(typeof result.data.answer).toBe("string");
      expect(result.data.answer.length).toBeGreaterThan(0);
    });

    it("should return success with order_issues content", () => {
      const result = execute({ topic: "order_issues" });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe("order_issues");
      expect(typeof result.data.answer).toBe("string");
      expect(result.data.answer.length).toBeGreaterThan(0);
    });

    it("should return success with account_help content", () => {
      const result = execute({ topic: "account_help" });

      expect(result.success).toBe(true);
      expect(result.data.topic).toBe("account_help");
      expect(typeof result.data.answer).toBe("string");
      expect(result.data.answer.length).toBeGreaterThan(0);
    });
  });

  describe("execute - invalid topics", () => {
    it("should return invalid_topic for a random string", () => {
      const result = execute({ topic: "random" });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_topic");
      expect(typeof result.message).toBe("string");
    });

    it("should return invalid_topic for an empty string", () => {
      const result = execute({ topic: "" });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_topic");
      expect(typeof result.message).toBe("string");
    });

    it("should return invalid_topic for undefined topic", () => {
      const result = execute({ topic: undefined });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_topic");
      expect(typeof result.message).toBe("string");
    });

    it("should return invalid_topic for null topic", () => {
      const result = execute({ topic: null });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_topic");
      expect(typeof result.message).toBe("string");
    });
  });
});
