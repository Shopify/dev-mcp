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

    it("should remove HTML comments", () => {
      const input = `
<!-- This is an HTML comment -->
<div>
  <p>Content</p>
  <!-- Another comment -->
</div>
      `;

      const result = extractCodeFromBlock(input, { removeHtmlComments: true });

      // The actual output has extra whitespace when comments are removed
      expect(result.trim()).toBe(`<div>
  <p>Content</p>
</div>`);
    });

    it("should remove JavaScript comments", () => {
      const input = `
// This is a single line comment
const product = {
  id: "123",
  /* This is a multi-line comment */
  title: "Product Name"
};
// Another comment
      `;

      const result = extractCodeFromBlock(input, { removeJsComments: true });

      // The actual output has extra whitespace when comments are removed
      expect(result.trim()).toBe(`const product = {
  id: "123",
  title: "Product Name"
};`);
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

    it("should handle complex TypeScript with JSX", () => {
      const input = `
\`\`\`tsx
<!-- Component comment -->
import React from 'react';

// Interface comment
interface Props {
  name: string;
  age: number;
}

// Component comment
const UserProfile: React.FC<Props> = ({ name, age }) => {
  return (
    <div className="user-profile">
      <!-- User info comment -->
      <h2>{name}</h2>
      <p>Age: {age}</p>
    </div>
  );
};
\`\`\`
      `;

      const result = extractCodeWithStrategy(input, "typescript");

      expect(result.trim()).toBe(`import React from 'react';

// Interface comment
interface Props {
  name: string;
  age: number;
}

// Component comment
const UserProfile: React.FC<Props> = ({ name, age }) => {
  return (
    <div className="user-profile">
      <h2>{name}</h2>
      <p>Age: {age}</p>
    </div>
  );
};`);
    });
  });

  describe("JavaScript Codeblock Extraction", () => {
    it("should use javascript strategy correctly", () => {
      const input = `
\`\`\`javascript
// This is a JavaScript comment
const products = [
  { id: 1, name: "Product 1" },
  /* Multi-line comment */
  { id: 2, name: "Product 2" }
];

// Function comment
function getProduct(id) {
  return products.find(p => p.id === id);
}
\`\`\`
      `;

      const result = extractCodeWithStrategy(input, "javascript");

      expect(result.trim()).toBe(`const products = [
  { id: 1, name: "Product 1" },
  { id: 2, name: "Product 2" }
];

function getProduct(id) {
  return products.find(p => p.id === id);
}`);
    });

    it("should handle JavaScript with complex comments", () => {
      const input = `
\`\`\`js
// Single line comment
const config = {
  apiUrl: "https://api.example.com",
  /* 
   * Multi-line comment
   * with multiple lines
   */
  timeout: 5000,
  // Another comment
  retries: 3
};

// Function with inline comment
function fetchData(url) { // Inline comment
  return fetch(url);
}
\`\`\`
      `;

      const result = extractCodeWithStrategy(input, "javascript");

      expect(result.trim()).toBe(`const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};

function fetchData(url) {
  return fetch(url);
}`);
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
