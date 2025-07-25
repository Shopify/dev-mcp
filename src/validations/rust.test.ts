import { describe, expect, it } from "vitest";
import { ValidationResult } from "../types.js";
import { validateRustCodeBlock } from "./rust.js";

describe("validateRustCodeBlock", () => {
  describe("valid Rust code", () => {
    it("should validate simple function", () => {
      const input = {
        code: `
fn main() {
    println!("Hello, world!");
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
      expect(result.resultDetail).toContain("valid syntax");
    });

    it("should validate struct and impl", () => {
      const input = {
        code: `
struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Self {
        Person { name, age }
    }
    
    fn greet(&self) {
        println!("Hello, my name is {}", self.name);
    }
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate match statements", () => {
      const input = {
        code: `
fn classify_number(n: i32) -> &'static str {
    match n {
        1 => "one",
        2 | 3 => "two or three",
        4..=10 => "between four and ten",
        _ => "something else",
    }
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate generics and traits", () => {
      const input = {
        code: `
trait Display {
    fn display(&self) -> String;
}

struct Container<T> {
    value: T,
}

impl<T: Display> Container<T> {
    fn show(&self) -> String {
        self.value.display()
    }
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should validate code with markdown blocks", () => {
      const input = {
        code: `
\`\`\`rust
fn hello() -> String {
    "Hello".to_string()
}
\`\`\`
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });
  });

  describe("invalid Rust code", () => {
    it("should detect unclosed brace", () => {
      const input = {
        code: `
fn broken() {
    println!("missing brace");
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("syntax error");
    });

    it("should detect invalid syntax", () => {
      const input = {
        code: `
fn bad() {
    let x = ;
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("syntax error");
    });

    it("should detect missing semicolon in statement", () => {
      const input = {
        code: `
fn missing_semicolon() {
    let x = 5
    let y = 10;
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
    });

    it("should detect invalid struct syntax", () => {
      const input = {
        code: `
struct Bad {
    name: String
    age: u32,
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
    });

    it("should provide line information in error", () => {
      const input = {
        code: `
fn good() {
    let x = 5;
}

fn bad() {
    let y = ;
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      // Should contain line information
      expect(result.resultDetail).toMatch(/line \d+/i);
    });
  });

  describe("input validation", () => {
    it("should reject empty code", () => {
      const input = { code: "" };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Invalid input");
    });

    it("should reject missing code property", () => {
      const input = {} as any;

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Invalid input");
    });
  });

  describe("code extraction", () => {
    it("should handle Rust comments", () => {
      const input = {
        code: `
// Single line comment
fn test() -> bool {
    /* Multi-line 
       comment */
    true
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });

    it("should handle whitespace variations", () => {
      const input = {
        code: `


        fn   test()   ->   bool   {
            true
        }


        `,
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });
  });
});
