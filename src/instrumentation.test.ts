import { instrumentationData } from "./instrumentation.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Buffer } from "buffer";
import type { PathLike } from "fs";
import * as fs from "fs/promises";
import { v4 } from "uuid";

vi.mock("fs/promises", async () => {
  const actual =
    await vi.importActual<typeof import("fs/promises")>("fs/promises");
  return {
    ...actual,
    mkdir: vi.fn().mockImplementation(() => Promise.resolve()),
    readFile: vi
      .fn()
      .mockImplementation(() => Promise.reject(new Error("File not found"))),
    writeFile: vi
      .fn()
      .mockImplementation(
        (
          file: PathLike,
          data: string | Buffer | Uint8Array,
          options?: { encoding?: string | null } | string | null,
        ) => {
          if (typeof data === "string" && options === "utf-8") {
            return Promise.resolve();
          }
          return Promise.reject(new Error("Invalid data type or encoding"));
        },
      ),
    access: vi.fn().mockImplementation(() => Promise.resolve()),
  };
});

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid"),
}));

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("mock-uuid"),
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn().mockImplementation((...args) => args[args.length - 1]),
  },
}));

vi.mock("os", () => ({
  homedir: vi.fn().mockReturnValue("/mock-home"),
}));

describe("instrumentationData", () => {
  const mockUuid = "mock-uuid";
  const mockPackageVersion = "1.0.0";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(v4).mockReturnValue(mockUuid as unknown as any);
  });

  describe("file system operations", () => {
    it("should handle directory creation failure", async () => {
      vi.mocked(fs.mkdir).mockImplementationOnce(() =>
        Promise.reject(new Error("Permission denied")),
      );
      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
      expect(data.sessionId).toBe(mockUuid);
    });

    it("should handle directory access check failure", async () => {
      vi.mocked(fs.access).mockImplementationOnce(() =>
        Promise.reject(new Error("Permission denied")),
      );
      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
      expect(data.sessionId).toBe(mockUuid);
    });

    it("should handle installation ID file read failure", async () => {
      vi.mocked(fs.readFile).mockImplementationOnce(() =>
        Promise.reject(new Error("File not found")),
      );
      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
    });

    it("should handle session file read failure", async () => {
      vi.mocked(fs.readFile).mockImplementationOnce(() =>
        Promise.reject(new Error("File not found")),
      );
      const data = await instrumentationData();
      expect(data.sessionId).toBe(mockUuid);
    });

    it("should handle file write failure", async () => {
      vi.mocked(fs.writeFile).mockImplementationOnce(() =>
        Promise.reject(new Error("Permission denied")),
      );
      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
      expect(data.sessionId).toBe(mockUuid);
    });
  });

  describe("session management", () => {
    it("should create new session when no session exists", async () => {
      vi.mocked(fs.readFile).mockImplementationOnce(() =>
        Promise.reject(new Error("File not found")),
      );
      const data = await instrumentationData();
      expect(data.sessionId).toBe(mockUuid);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[0]).toBe("session.json");
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.sessionId).toBe(mockUuid);
      expect(writtenData.lastRefreshed).toBeDefined();
      expect(writeCall[2]).toBe("utf-8");
    });

    it("should reuse valid session", async () => {
      const existingSession = {
        sessionId: "existing-session",
        lastRefreshed: new Date().toISOString(),
      };
      vi.mocked(fs.readFile)
        .mockImplementationOnce(() => Promise.resolve(mockUuid))
        .mockImplementationOnce(() =>
          Promise.resolve(JSON.stringify(existingSession)),
        );

      const data = await instrumentationData();
      expect(data.sessionId).toBe("existing-session");
    });

    it("should create new session when existing session is expired", async () => {
      const expiredSession = {
        sessionId: "expired-session",
        lastRefreshed: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };
      vi.mocked(fs.readFile)
        .mockImplementationOnce(() => Promise.resolve(mockUuid))
        .mockImplementationOnce(() =>
          Promise.resolve(JSON.stringify(expiredSession)),
        );

      const data = await instrumentationData();
      expect(data.sessionId).toBe(mockUuid);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[0]).toBe("session.json");
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.sessionId).toBe(mockUuid);
      expect(writtenData.lastRefreshed).toBeDefined();
      expect(writeCall[2]).toBe("utf-8");
    });

    it("should handle invalid session data", async () => {
      vi.mocked(fs.readFile)
        .mockImplementationOnce(() => Promise.resolve(mockUuid))
        .mockImplementationOnce(() => Promise.resolve("invalid-json"));

      const data = await instrumentationData();
      expect(data.sessionId).toBe(mockUuid);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[0]).toBe("session.json");
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.sessionId).toBe(mockUuid);
      expect(writtenData.lastRefreshed).toBeDefined();
      expect(writeCall[2]).toBe("utf-8");
    });
  });

  describe("instrumentation configuration", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return empty IDs when instrumentation is disabled", async () => {
      process.env.npm_package_json = JSON.stringify({
        config: {
          instrumentation: false,
        },
      });

      const data = await instrumentationData();
      expect(data.installationId).toBe("");
      expect(data.sessionId).toBe("");
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });

    it("should return IDs when instrumentation is enabled", async () => {
      process.env.npm_package_json = JSON.stringify({
        config: {
          instrumentation: true,
        },
      });

      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
      expect(data.sessionId).toBe(mockUuid);
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });

    it("should default to enabled when config is missing", async () => {
      process.env.npm_package_json = JSON.stringify({});

      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
      expect(data.sessionId).toBe(mockUuid);
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });

    it("should default to enabled when package.json is invalid", async () => {
      process.env.npm_package_json = "invalid json";

      const data = await instrumentationData();
      expect(data.installationId).toBe(mockUuid);
      expect(data.sessionId).toBe(mockUuid);
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });
  });
});
