import { describe, expect, it } from "vitest";
import {
  extractCodeFromBlock,
  extractCodeWithStrategy,
  extractGraphQLCode,
  extractGraphQLCodeClean,
  extractTypeScriptCode,
} from "./codeblockExtraction.js";

describe("Codeblock Extraction", () => {
  describe("General Codeblock Extraction", () => {
    it("should trim whitespace by default", () => {
      const input = `
  query GetProduct {
    product {
      id
    }
  }
      `;

      const result = extractCodeFromBlock(input);

      expect(result).toBe(`query GetProduct {
    product {
      id
    }
  }`);
    });

    it("should not trim whitespace when explicitly disabled", () => {
      const input = `
  query GetProduct {
    product {
      id
    }
  }
      `;

      const result = extractCodeFromBlock(input, { trimWhitespace: false });

      expect(result).toBe(input);
    });

    it("should remove markdown code blocks", () => {
      const input = `
\`\`\`graphql
query GetProduct {
  product {
    id
  }
}
\`\`\`
      `;

      const result = extractCodeFromBlock(input, {
        removeMarkdownBlocks: true,
      });

      expect(result.trim()).toBe(`query GetProduct {
  product {
    id
  }
}`);
    });
  });

  describe("TypeScript Codeblock Extraction", () => {
    it("should use typescript strategy correctly", () => {
      const input = `
\`\`\`typescript
<!-- This is an HTML comment -->
import React from 'react';

// This is a TypeScript comment
interface Product {
  id: string;
  title: string;
}

const ProductComponent: React.FC<Product> = ({ id, title }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>ID: {id}</p>
    </div>
  );
};
\`\`\`
      `;

      const result = extractCodeWithStrategy(input, "typescript");

      expect(result.trim()).toBe(`import React from 'react';

// This is a TypeScript comment
interface Product {
  id: string;
  title: string;
}

const ProductComponent: React.FC<Product> = ({ id, title }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>ID: {id}</p>
    </div>
  );
};`);
    });

    it("should use extractTypeScriptCode function", () => {
      const input = `
\`\`\`typescript
<!-- HTML comment -->
// TypeScript comment
const greeting = "Hello, World!";
\`\`\`
      `;

      const result = extractTypeScriptCode(input);

      expect(result.trim()).toBe(`// TypeScript comment
const greeting = "Hello, World!";`);
    });
  });

  describe("GraphQL Codeblock Extraction", () => {
    describe("GraphQL Comments", () => {
      it("should remove GraphQL comments (lines starting with #)", () => {
        const input = `
# This is a GraphQL comment
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}
# Another comment
      `;

        const result = extractCodeFromBlock(input, {
          removeGraphqlComments: true,
          trimWhitespace: true,
        });

        expect(result.trim()).toBe(`query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}`);
      });

      it("should preserve GraphQL comments when option is disabled", () => {
        const input = `
# This is a GraphQL comment
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}
      `;

        const result = extractCodeFromBlock(input, {
          removeGraphqlComments: false,
          trimWhitespace: true,
        });

        expect(result).toContain("# This is a GraphQL comment");
      });
    });

    describe("GraphQL Directives", () => {
      it("should remove GraphQL directives", () => {
        const input = `
query GetProduct($id: ID!) @include(if: $includeProduct) {
  product(id: $id) @deprecated(reason: "Use newProduct instead") {
    id
    title @skip(if: $skipTitle)
  }
}
      `;

        const result = extractCodeFromBlock(input, {
          removeGraphqlDirectives: true,
          trimWhitespace: true,
        });

        expect(result.trim()).toBe(`query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}`);
      });
    });

    describe("GraphQL Fragments", () => {
      it("should remove fragment definitions and spreads", () => {
        const input = `
fragment ProductFields on Product {
  id
  title
  description
}

query GetProduct($id: ID!) {
  product(id: $id) {
    ...ProductFields
    price
  }
}
      `;

        const result = extractCodeFromBlock(input, {
          removeGraphqlFragments: true,
          trimWhitespace: true,
        });

        expect(result.trim()).toBe(`query GetProduct($id: ID!) {
  product(id: $id) {
    price
  }
}`);
      });
    });

    describe("GraphQL Variables", () => {
      it("should remove variable definitions and usages", () => {
        const input = `
query GetProduct($id: ID!, $includePrice: Boolean!) {
  product(id: $id) {
    id
    title
    price @include(if: $includePrice)
  }
}
      `;

        const result = extractCodeFromBlock(input, {
          removeGraphqlVariables: true,
          trimWhitespace: true,
        });

        expect(result.trim()).toBe(`query GetProduct() {
  product(id: ) {
    id
    title
    price @include(if: )
  }
}`);
      });
    });

    describe("GraphQL Strategies", () => {
      it("should use graphqlClean strategy correctly", () => {
        const input = `
\`\`\`graphql
# This is a comment
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}
\`\`\`
      `;

        const result = extractCodeWithStrategy(input, "graphqlClean");

        expect(result.trim()).toBe(`query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}`);
      });

      it("should use graphqlStrict strategy correctly", () => {
        const input = `
\`\`\`graphql
# This is a comment
fragment ProductFields on Product {
  id
  title
}

query GetProduct($id: ID!) @include(if: $includeProduct) {
  product(id: $id) {
    ...ProductFields
    price @include(if: $includePrice)
  }
}
\`\`\`
      `;

        const result = extractCodeWithStrategy(input, "graphqlStrict");

        expect(result.trim()).toBe(`query GetProduct() {
  product(id: ) {
    price
  }
}`);
      });

      it("should use extractGraphQLCode function", () => {
        const input = `
# Comment
fragment ProductFields on Product {
  id
  title
}

query GetProduct($id: ID!) {
  product(id: $id) {
    ...ProductFields
  }
}
      `;

        const result = extractGraphQLCode(input);

        expect(result.trim()).toBe(`query GetProduct() {
  product(id: ) {
  }
}`);
      });

      it("should use extractGraphQLCodeClean function", () => {
        const input = `
\`\`\`graphql
# Comment
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}
\`\`\`
      `;

        const result = extractGraphQLCodeClean(input);

        expect(result.trim()).toBe(`query GetProduct($id: ID!) {
  product(id: $id) {
    id
    title
  }
}`);
      });
    });

    describe("Complex GraphQL Examples", () => {
      it("should handle complex GraphQL with all features", () => {
        const input = `
\`\`\`graphql
# Get product with optional fields
fragment ProductFields on Product {
  id
  title
  description
}

fragment PriceFields on Money {
  amount
  currencyCode
}

query GetProduct($id: ID!, $includePrice: Boolean!, $includeDescription: Boolean!) @include(if: $includeProduct) {
  product(id: $id) @deprecated(reason: "Use newProduct instead") {
    ...ProductFields
    price @include(if: $includePrice) {
      ...PriceFields
    }
    description @skip(if: $includeDescription)
  }
}
\`\`\`
      `;

        const result = extractCodeWithStrategy(input, "graphqlStrict");

        expect(result.trim()).toBe(`query GetProduct() {
  product(id: ) {
    price {
    }
    description
  }
}`);
      });
    });
  });

  describe("Strategy Combinations", () => {
    it("should handle multiple extraction options together", () => {
      const input = `
\`\`\`typescript
<!-- HTML comment -->
// TypeScript comment
/* Multi-line comment */
const greeting = "Hello, World!";
\`\`\`
      `;

      const result = extractCodeFromBlock(input, {
        removeMarkdownBlocks: true,
        removeHtmlComments: true,
        removeJsComments: true,
        trimWhitespace: true,
      });

      expect(result.trim()).toBe(`const greeting = "Hello, World!";`);
    });

    it("should handle no extraction options", () => {
      const input = `
\`\`\`typescript
// Comment
const code = "test";
\`\`\`
      `;

      const result = extractCodeFromBlock(input, {});

      expect(result.trim()).toBe(input.trim());
    });

    it("should use none strategy correctly", () => {
      const input = `
\`\`\`typescript
// Comment
const code = "test";
\`\`\`
      `;

      const result = extractCodeWithStrategy(input, "none");

      expect(result.trim()).toBe(input.trim());
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty input", () => {
      const result = extractCodeFromBlock("");
      expect(result).toBe("");
    });

    it("should handle input with only whitespace", () => {
      const result = extractCodeFromBlock("   \n  \n  ");
      expect(result).toBe("");
    });

    it("should handle input with only comments", () => {
      const input = `
# GraphQL comment
// JavaScript comment
<!-- HTML comment -->
      `;

      const result = extractCodeFromBlock(input, {
        removeGraphqlComments: true,
        removeJsComments: true,
        removeHtmlComments: true,
        trimWhitespace: true,
      });

      expect(result.trim()).toBe("");
    });

    it("should handle nested comments", () => {
      const input = `
<!-- HTML comment with // JavaScript comment inside -->
// JavaScript comment with <!-- HTML comment inside -->
const code = "test";
      `;

      const result = extractCodeFromBlock(input, {
        removeHtmlComments: true,
        removeJsComments: true,
        trimWhitespace: true,
      });

      expect(result.trim()).toBe(`const code = "test";`);
    });

    it("should handle malformed markdown blocks", () => {
      const input = `
\`\`\`typescript
const code = "test";
// Missing closing backticks
      `;

      const result = extractCodeFromBlock(input, {
        removeMarkdownBlocks: true,
        trimWhitespace: true,
      });

      expect(result.trim()).toBe(`const code = "test";
// Missing closing backticks`);
    });
  });
});
