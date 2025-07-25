import { describe, expect, it } from "vitest";
import { ValidationResult } from "../types.js";
import { validateJavaScriptCodeBlock } from "./javascript.js";
import { validateRustCodeBlock } from "./rust.js";

describe("Functions Codeblocks Validation", () => {
  describe("JavaScript validation", () => {
    it("should validate valid JavaScript function", () => {
      const input = {
        code: `
function discountFunction(input) {
  const percentage = 10;
  return {
    discountApplicationStrategy: "FIRST",
    discounts: [{
      value: {
        percentage: {
          value: percentage.toString()
        }
      },
      targets: [{ productVariant: { id: input.cart.lines[0].merchandise.id } }]
    }]
  };
}
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
      expect(result.resultDetail).toContain("valid syntax");
    });

    it("should detect JavaScript syntax errors", () => {
      const input = {
        code: `
function brokenFunction(input) {
  const percentage = 10;
  return {
    discountApplicationStrategy: "FIRST",
    discounts: [{
      value: {
        percentage: {
          value: percentage.toString()
        }
      },
      targets: [{ productVariant: { id: input.cart.lines[0].merchandise.id } }]
    }]
  // Missing closing brace
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("syntax error");
    });

    it("should handle markdown code blocks", () => {
      const input = {
        code: `
\`\`\`javascript
function testFunction() {
  return "hello world";
}
\`\`\`
        `.trim(),
      };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });
  });

  describe("Rust validation", () => {
    it("should validate valid Rust function", () => {
      const input = {
        code: `
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    let targets = input
        .cart
        .lines
        .iter()
        .map(|line| {
            output::Target {
                product_variant: Some(output::ProductVariantTarget {
                    id: line.merchandise.id.to_string(),
                }),
            }
        })
        .collect();

    Ok(output::FunctionResult {
        discounts: vec![output::Discount {
            value: output::Value {
                percentage: Some(output::Percentage { value: 10.0 }),
                fixed_amount: None,
            },
            targets,
        }],
        discount_application_strategy: output::DiscountApplicationStrategy::FIRST,
    })
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
      expect(result.resultDetail).toContain("valid syntax");
    });

    it("should detect Rust syntax errors", () => {
      const input = {
        code: `
fn broken_function() {
    let x = 5;
    let y = ;  // Syntax error
}
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("syntax error");
    });

    it("should handle markdown code blocks", () => {
      const input = {
        code: `
\`\`\`rust
fn test_function() -> bool {
    true
}
\`\`\`
        `.trim(),
      };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.SUCCESS);
    });
  });

  describe("input validation", () => {
    it("should reject empty JavaScript code", () => {
      const input = { code: "" };

      const result = validateJavaScriptCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Invalid input");
    });

    it("should reject empty Rust code", () => {
      const input = { code: "" };

      const result = validateRustCodeBlock(input);

      expect(result.result).toBe(ValidationResult.FAILED);
      expect(result.resultDetail).toContain("Invalid input");
    });
  });
});
