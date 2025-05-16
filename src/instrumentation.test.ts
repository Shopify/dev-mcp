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

vi.mock("../package.json", () => ({
  default: { version: "1.0.0" },
}));

describe("instrumentationData", () => {
  const mockPackageVersion = "1.0.0";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("instrumentation configuration", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return empty object when instrumentation is disabled", async () => {
      process.env.OPT_OUT_INSTRUMENTATION = "true";

      const data = await instrumentationData();
      expect(data).toEqual({});
    });

    it("should return data when instrumentation is enabled", async () => {
      process.env.npm_package_json = JSON.stringify({
        config: {
          instrumentation: true,
        },
      });

      const data = await instrumentationData();
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });

    it("should default to enabled when config is missing", async () => {
      process.env.npm_package_json = JSON.stringify({});

      const data = await instrumentationData();
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });

    it("should default to enabled when package.json is invalid", async () => {
      process.env.npm_package_json = "invalid json";

      const data = await instrumentationData();
      expect(data.packageVersion).toBe(mockPackageVersion);
      expect(data.timestamp).toBeDefined();
    });
  });
});
