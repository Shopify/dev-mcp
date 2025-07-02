import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateConversationId,
  isInstrumentationDisabled,
  instrumentationData,
} from "./instrumentation.js";

// Mock the environment variable
const originalEnv = process.env;

describe("instrumentation", () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset environment to clean state
    process.env = { ...originalEnv };
    delete process.env.OPT_OUT_INSTRUMENTATION;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isInstrumentationDisabled", () => {
    it("returns false when OPT_OUT_INSTRUMENTATION is not set", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      expect(isInstrumentationDisabled()).toBe(false);
    });

    it("returns false when OPT_OUT_INSTRUMENTATION is false", () => {
      process.env.OPT_OUT_INSTRUMENTATION = "false";
      expect(isInstrumentationDisabled()).toBe(false);
    });

    it("returns true when OPT_OUT_INSTRUMENTATION is true", () => {
      process.env.OPT_OUT_INSTRUMENTATION = "true";
      expect(isInstrumentationDisabled()).toBe(true);
    });

    it("returns false when OPT_OUT_INSTRUMENTATION is other value", () => {
      process.env.OPT_OUT_INSTRUMENTATION = "something-else";
      expect(isInstrumentationDisabled()).toBe(false);
    });
  });

  describe("generateConversationId", () => {
    it("returns a UUID when instrumentation is enabled", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      const conversationId = generateConversationId();

      // Check that it's a valid UUID format (36 characters with dashes)
      expect(conversationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(conversationId).not.toBe("opted-out");
    });

    it("returns 'opted-out' when instrumentation is disabled", () => {
      process.env.OPT_OUT_INSTRUMENTATION = "true";
      const conversationId = generateConversationId();

      expect(conversationId).toBe("opted-out");
    });

    it("generates different UUIDs on multiple calls when enabled", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      const id1 = generateConversationId();
      const id2 = generateConversationId();

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe("opted-out");
      expect(id2).not.toBe("opted-out");
    });

    it("consistently returns 'opted-out' on multiple calls when disabled", () => {
      process.env.OPT_OUT_INSTRUMENTATION = "true";
      const id1 = generateConversationId();
      const id2 = generateConversationId();

      expect(id1).toBe("opted-out");
      expect(id2).toBe("opted-out");
    });
  });

  describe("instrumentationData", () => {
    it("returns empty object when instrumentation is disabled", () => {
      process.env.OPT_OUT_INSTRUMENTATION = "true";
      const data = instrumentationData("some-conversation-id");

      expect(data).toEqual({});
    });

    it("returns full data when instrumentation is enabled", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      const conversationId = "test-conversation-id";
      const data = instrumentationData(conversationId);

      expect(data).toHaveProperty("packageVersion");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("conversationId", conversationId);
      expect(typeof data.packageVersion).toBe("string");
      expect(typeof data.timestamp).toBe("string");
    });

    it("returns data without conversationId when not provided and instrumentation is enabled", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      const data = instrumentationData();

      expect(data).toHaveProperty("packageVersion");
      expect(data).toHaveProperty("timestamp");
      expect(data).not.toHaveProperty("conversationId");
    });

    it("includes 'opted-out' conversationId in data when instrumentation is enabled", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      const data = instrumentationData("opted-out");

      expect(data).toHaveProperty("packageVersion");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("conversationId", "opted-out");
    });

    it("handles timestamp format correctly", () => {
      delete process.env.OPT_OUT_INSTRUMENTATION;
      const data = instrumentationData("test-id");

      // Should be a valid ISO timestamp
      expect(data.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(new Date(data.timestamp!)).toBeInstanceOf(Date);
    });
  });
});
