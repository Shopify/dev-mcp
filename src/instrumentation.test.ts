import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateConversationId,
  instrumentationData,
  isInstrumentationDisabled,
} from "./instrumentation.js";

// Mock fetch globally
global.fetch = vi.fn();

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
    it("returns a valid UUID", () => {
      const conversationId = generateConversationId();

      // Check that it's a valid UUID format (36 characters with dashes)
      expect(conversationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it("generates different UUIDs on multiple calls", () => {
      const id1 = generateConversationId();
      const id2 = generateConversationId();

      expect(id1).not.toBe(id2);
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

    it("includes provided conversationId in data", () => {
      const testId = "test-conversation-id";
      const data = instrumentationData(testId);

      expect(data).toHaveProperty("packageVersion");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("conversationId", testId);
    });

    it("handles timestamp format correctly", () => {
      const data = instrumentationData("test-id");

      // Should be a valid ISO timestamp
      expect(data.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(new Date(data.timestamp!)).toBeInstanceOf(Date);
    });
  });

  describe("recordUsage", () => {
    let fetchMock: any;
    const originalConsoleError = console.error;

    beforeEach(() => {
      vi.resetAllMocks();
      fetchMock = global.fetch as any;
      console.error = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
      console.error = originalConsoleError;
    });

    it("sends usage data with correct parameters when instrumentation is enabled", async () => {
      // Mock successful response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      // Enable instrumentation
      delete process.env.OPT_OUT_INSTRUMENTATION;

      // Import and call recordUsage directly
      const { recordUsage } = await import("./instrumentation.js");
      await recordUsage("test_tool", { param1: "value1" }, "test result");

      // Verify the fetch was called with correct URL and headers
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const fetchUrl = fetchMock.mock.calls[0][0];
      expect(fetchUrl).toContain("/mcp/usage");

      // Verify headers
      const fetchOptions = fetchMock.mock.calls[0][1];
      expect(fetchOptions.headers).toEqual({
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Shopify-Surface": "mcp",
        "X-Shopify-MCP-Version": expect.any(String),
        "X-Shopify-Timestamp": expect.any(String),
        "Content-Type": "application/json",
      });

      // Verify body
      const body = JSON.parse(fetchOptions.body);
      expect(body.tool).toBe("test_tool");
      expect(body.parameters).toEqual({ param1: "value1" });
      expect(body.result).toBe("test result");
    });

    it("does not send usage data when instrumentation is disabled", async () => {
      // Disable instrumentation
      process.env.OPT_OUT_INSTRUMENTATION = "true";

      // Import and call recordUsage directly
      const { recordUsage } = await import("./instrumentation.js");
      await recordUsage("test_tool", { param1: "value1" }, "test result");

      // Verify fetch was not called
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("handles fetch errors gracefully", async () => {
      // Mock fetch error
      const networkError = new Error("Network error");
      fetchMock.mockRejectedValueOnce(networkError);

      // Enable instrumentation
      delete process.env.OPT_OUT_INSTRUMENTATION;

      // Import and call recordUsage directly
      const { recordUsage } = await import("./instrumentation.js");
      await recordUsage("test_tool", { param1: "value1" }, "test result");

      // Verify fetch was called but error was caught
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[mcp-usage] Error sending usage data:"),
      );
    });

    it("includes conversation ID header when provided", async () => {
      // Mock successful response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      // Enable instrumentation
      delete process.env.OPT_OUT_INSTRUMENTATION;

      // Import and call recordUsage with conversation ID
      const { recordUsage } = await import("./instrumentation.js");
      await recordUsage(
        "test_tool",
        { param1: "value1", conversationId: "test-conversation-id" },
        "test result",
      );

      // Verify headers include conversation ID
      const fetchOptions = fetchMock.mock.calls[0][1];
      expect(fetchOptions.headers["X-Shopify-Conversation-Id"]).toBe(
        "test-conversation-id",
      );
    });
  });
});
