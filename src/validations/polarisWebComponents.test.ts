import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePolarisWebComponents } from "./polarisWebComponents.js";

describe("validatePolarisWebComponents", () => {
  describe("app home", () => {
    describe("valid components", () => {
      it("s-button", () => {
        const codeBlock = "```<s-button>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(true);
      });
    });

    describe("valid props", () => {
      it("s-button", () => {
        const codeBlock =
          "```<s-button variant='primary'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(true);
      });
    });

    describe("valid prop values", () => {
      it("s-button", () => {
        const codeBlock =
          "```<s-button variant='secondary'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(true);
      });
    });

    describe("invalid components", () => {
      it("p-button", () => {
        const codeBlock = "```<p-button>Hello, World</p-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(false);
      });

      it("s-block-stack", () => {
        const codeBlock = "```<s-block-stack>Hello, World</s-block-stack>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(false);
      });

      it("s-inline-stack", () => {
        const codeBlock = "```<s-inline-stack>Hello, World</s-inline-stack>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(false);
      });
    });

    describe("invalid props", () => {
      it("s-button doesn't support appearance", () => {
        const codeBlock = "```<s-button appearance>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(false);
      });
    });

    describe("invalid prop values", () => {
      it("s-button doesn't support variant 'plain'", () => {
        const codeBlock =
          "```<s-button variant='plain'>Hello, World</s-button>```";
        const { result } = validatePolarisWebComponents(codeBlock);
        expect(result).toBe(false);
      });
    });
  });
});
