import { describe, expect, it } from "vitest";
import { ValidationResult } from "../types.js";
import { validateJavaScriptCodeBlock } from "./javascript.js";

describe("validateJavaScriptCodeBlock", () => {
  describe("valid JavaScript code", () => {
    it("should validate simple function declaration", () => {
      const input = {
        code: `
function hello() {
  console.log("Hello, world!");
}
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
      expect(result.resultDetail).toContain("valid syntax");
    });

    it("should validate modern ES6+ syntax", () => {
      const input = {
        code: `
const arrow = (x) => x * 2;
const { name, age } = person;
const nums = [1, 2, 3].map(n => n * 2);
class MyClass extends Base {
  async method() {
    const result = await fetch('/api');
    return result.json();
  }
}
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate code with markdown blocks", () => {
      const input = {
        code: `
\`\`\`javascript
function test() {
  return true;
}
\`\`\`
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate import/export statements", () => {
      const input = {
        code: `
import { useState } from 'react';
export const MyComponent = () => {
  const [count, setCount] = useState(0);
  return count * 2; // JSX would need special parser config
};
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });
  });

  describe("invalid JavaScript code", () => {
    it("should detect unclosed brace", () => {
      const input = {
        code: `
function broken() {
  console.log("missing brace");
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("syntax error");
    });

    it("should detect invalid syntax", () => {
      const input = {
        code: `
const invalid = {
  key: value,
  another: 
};
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("syntax error");
    });

    it("should detect invalid assignment", () => {
      const input = {
        code: `
const obj = {
  key: value = 
};
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
    });

    it("should provide line information in error", () => {
      const input = {
        code: `
const good = "working";
const bad = {
  invalid: 
};
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      // Should contain line information
      expect(result.resultDetail).toMatch(/line \d+/i);
    });
  });

  describe("input validation", () => {
    it("should reject empty code", () => {
      const input = { code: "" };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Invalid input");
    });

    it("should reject missing code property", () => {
      const input = {} as any;

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Invalid input");
    });
  });

  describe("code extraction", () => {
    it("should handle JavaScript comments", () => {
      const input = {
        code: `
// This is a comment
function test() {
  /* Block comment */
  return true;
}
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should handle whitespace variations", () => {
      const input = {
        code: `


        function test()   {
          return    true;
        }


        `,
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });
  });
});
