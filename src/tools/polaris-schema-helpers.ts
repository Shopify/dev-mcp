import { searchShopifyDocs } from "./index.js";

export interface ComponentInfo {
  tag: string;
  description: string;
  attributes?: Record<string, any>;
  children?: string[];
  source: "schema" | "live-docs" | "hybrid";
  capability?: any;
  usageExamples?: string[];
  relatedComponents?: string[];
  bestPractices?: string[];
}

interface ComponentSuggestion {
  component: string;
  reasoning: string;
  props?: Record<string, any>;
  children?: string[];
  bestFor?: string[];
  confidence: number;
}

/**
 * Get component information with fallback validation
 * Uses schema first, then validates/supplements with live docs
 */
export async function getValidatedComponentInfo(
  componentTag: string,
  schema: any,
): Promise<ComponentInfo> {
  const schemaInfo = getSchemaComponentInfo(componentTag, schema);

  // Always validate against live docs for critical components
  if (isCriticalComponent(componentTag)) {
    const liveValidation = await validateAgainstLiveDocs(componentTag);

    if (liveValidation.hasChanges) {
      console.warn(
        `⚠️ Schema drift detected for ${componentTag}:`,
        liveValidation.changes,
      );
      // Could trigger an alert or create a GitHub issue here
    }

    return {
      ...schemaInfo,
      source: "hybrid",
      // Merge any new info from live docs
      ...liveValidation.updates,
    };
  }

  return { ...schemaInfo, source: "schema" };
}

function getSchemaComponentInfo(
  componentTag: string,
  schema: any,
): ComponentInfo {
  if (!schema?.definitions) {
    throw new Error("Schema not available");
  }

  const tagToDefinition: Record<string, string> = {
    "s-page": "Page",
    "s-section": "Section",
    "s-box": "Box",
    "s-stack": "Stack",
    "s-heading": "Heading",
    "s-text": "Text",
    "s-button": "Button",
    "s-text-field": "TextField",
    "s-select": "Select",
    "s-banner": "Banner",
    "s-badge": "Badge",
  };

  const definitionName = tagToDefinition[componentTag];
  if (!definitionName) {
    throw new Error(`Component '${componentTag}' not found in schema`);
  }

  const definition = schema.definitions[definitionName];
  return {
    tag: componentTag,
    description: definition.description || "No description available",
    attributes: definition.properties?.attributes?.properties || {},
    children: extractAllowedChildren(definition),
    source: "schema",
  };
}

function extractAllowedChildren(definition: any): string[] {
  const children: string[] = [];

  if (definition.properties?.children?.items?.anyOf) {
    definition.properties.children.items.anyOf.forEach((item: any) => {
      if (item.$ref) {
        const refName = item.$ref.split("/").pop();
        children.push(refName);
      }
    });
  }

  return children;
}

async function validateAgainstLiveDocs(componentTag: string) {
  try {
    // Use existing search tool to validate component still exists
    const searchResult = await searchShopifyDocs(
      `polaris web component ${componentTag}`,
    );

    const hasComponentInfo = searchResult.formattedText
      .toLowerCase()
      .includes(componentTag.toLowerCase());

    return {
      hasChanges: !hasComponentInfo,
      changes: hasComponentInfo
        ? []
        : [`Component ${componentTag} not found in live docs`],
      updates: {}, // Could parse live docs for new attributes/changes
    };
  } catch (error) {
    console.error(
      `Failed to validate ${componentTag} against live docs:`,
      error,
    );
    return { hasChanges: false, changes: [], updates: {} };
  }
}

function isCriticalComponent(componentTag: string): boolean {
  // Define which components are critical and need live validation
  const criticalComponents = [
    "s-page",
    "s-section",
    "s-button",
    "s-text-field",
  ];
  return criticalComponents.includes(componentTag);
}

/**
 * Generate component usage suggestions with validation
 */
export function generateUsageSuggestions(useCase: string, schema: any): string {
  const useCaseLower = useCase.toLowerCase();

  const suggestions: string[] = [
    `💡 **Component Suggestions for: ${useCase}**\n`,
  ];

  if (useCaseLower.includes("form") || useCaseLower.includes("input")) {
    suggestions.push("📝 **Form Pattern Detected**");
    suggestions.push("**Recommended Structure:**");
    suggestions.push("```html");
    suggestions.push("<s-page>");
    suggestions.push('  <s-section heading="Form Title">');
    suggestions.push('    <s-text-field label="Name" required></s-text-field>');
    suggestions.push('    <s-select label="Category"></s-select>');
    suggestions.push('    <s-button variant="primary">Submit</s-button>');
    suggestions.push("  </s-section>");
    suggestions.push("</s-page>");
    suggestions.push("```");
  } else if (
    useCaseLower.includes("dashboard") ||
    useCaseLower.includes("overview")
  ) {
    suggestions.push("📊 **Dashboard Pattern Detected**");
    suggestions.push("**Recommended Structure:**");
    suggestions.push("```html");
    suggestions.push("<s-page>");
    suggestions.push('  <s-section heading="Dashboard">');
    suggestions.push('    <s-stack gap="large">');
    suggestions.push('      <s-badge tone="success">Active</s-badge>');
    suggestions.push("      <s-text>Key metrics content</s-text>");
    suggestions.push("    </s-stack>");
    suggestions.push("  </s-section>");
    suggestions.push("</s-page>");
    suggestions.push("```");
  } else {
    suggestions.push("🏗️ **General Structure:**");
    suggestions.push("- Always start with `<s-page>` as root");
    suggestions.push("- Use `<s-section>` to organize content");
    suggestions.push("- Use `<s-stack>` for flexible layouts");
  }

  suggestions.push("\n📋 **Best Practices:**");
  suggestions.push("- Use semantic component names");
  suggestions.push("- Follow Built for Shopify guidelines");
  suggestions.push("- Test components in Shopify admin context");

  return suggestions.join("\n");
}

// Enhanced suggestion patterns for better accuracy
const USE_CASE_PATTERNS = {
  // Page layouts
  dashboard: {
    components: ["Page", "Section", "Grid", "Banner", "Stack"],
    hierarchy: "Page → Section → Grid/Stack → Components",
    keywords: ["dashboard", "overview", "summary", "metrics", "stats"],
  },

  // Forms and data entry
  form: {
    components: ["Page", "Section", "Stack", "TextField", "Button", "Checkbox"],
    hierarchy: "Page → Section → Stack → Form Components",
    keywords: ["form", "create", "edit", "input", "submit", "settings"],
  },

  // Data display
  table: {
    components: [
      "Page",
      "Section",
      "Table",
      "TableHeader",
      "TableBody",
      "TableRow",
    ],
    hierarchy: "Page → Section → Table → Table Components",
    keywords: ["table", "list", "data", "orders", "products", "customers"],
  },

  // Navigation
  navigation: {
    components: ["Page", "Section", "Stack", "Button", "Clickable"],
    hierarchy: "Page → Section → Navigation Components",
    keywords: ["nav", "menu", "sidebar", "navigation", "links"],
  },

  // Product management
  product: {
    components: [
      "Page",
      "Section",
      "Grid",
      "GridItem",
      "Image",
      "Text",
      "Button",
    ],
    hierarchy: "Page → Section → Grid → GridItem → Product Components",
    keywords: ["product", "catalog", "inventory", "item", "merchandise"],
  },

  // Order management
  order: {
    components: ["Page", "Section", "Table", "Badge", "Button", "Stack"],
    hierarchy: "Page → Section → Table/Stack → Order Components",
    keywords: ["order", "purchase", "transaction", "fulfillment", "shipping"],
  },
};

// Component capability mapping for intelligent suggestions
const COMPONENT_CAPABILITIES: Record<string, any> = {
  Page: {
    purpose: "Top-level container for app pages",
    bestFor: ["main layouts", "page structure"],
    children: ["Section", "Banner"],
    required: true,
  },

  Section: {
    purpose: "Content sections within pages",
    bestFor: ["content grouping", "layout sections"],
    children: ["Box", "Stack", "Grid", "Table", "Banner"],
    required: true,
  },

  Stack: {
    purpose: "Vertical or horizontal layout",
    bestFor: ["form layouts", "button groups", "content flow"],
    children: ["Box", "Button", "TextField", "Text", "Image"],
    flexible: true,
  },

  Grid: {
    purpose: "Responsive grid layouts",
    bestFor: ["card layouts", "responsive design", "equal columns"],
    children: ["GridItem"],
    responsive: true,
  },

  Button: {
    purpose: "Interactive actions",
    bestFor: ["primary actions", "form submission", "navigation"],
    variants: ["primary", "secondary", "tertiary"],
    tones: ["neutral", "critical", "auto"],
  },

  Table: {
    purpose: "Structured data display",
    bestFor: ["data tables", "lists", "comparisons"],
    children: ["TableHeader", "TableBody"],
    sortable: true,
  },

  TextField: {
    purpose: "Text input",
    bestFor: ["forms", "search", "data entry"],
    types: ["text", "email", "password", "number"],
    validation: true,
  },

  Badge: {
    purpose: "Status indicators",
    bestFor: ["status", "categories", "labels"],
    tones: ["info", "success", "warning", "critical"],
    sizes: ["small", "medium", "large"],
  },
};

// Enhanced suggestion algorithm
export function generateSmartSuggestions(
  useCase: string,
): ComponentSuggestion[] {
  const normalizedUseCase = useCase.toLowerCase();
  const suggestions: ComponentSuggestion[] = [];

  // 1. Pattern matching for use case types
  const matchedPatterns = Object.entries(USE_CASE_PATTERNS).filter(
    ([_, pattern]) =>
      pattern.keywords.some((keyword) => normalizedUseCase.includes(keyword)),
  );

  // 2. Score and rank suggestions
  const scoredSuggestions = matchedPatterns
    .map(([patternName, pattern]) => {
      const score = calculatePatternScore(normalizedUseCase, pattern);
      return {
        pattern: patternName,
        score,
        components: pattern.components,
        hierarchy: pattern.hierarchy,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 3. Generate component recommendations
  if (scoredSuggestions.length > 0) {
    const topPattern = scoredSuggestions[0];
    suggestions.push(...generateComponentStructure(topPattern, useCase));
  }

  // 4. Add fallback suggestions for common patterns
  if (suggestions.length === 0) {
    suggestions.push(...generateFallbackSuggestions(useCase));
  }

  return suggestions;
}

function calculatePatternScore(useCase: string, pattern: any): number {
  let score = 0;

  // Keyword matching
  pattern.keywords.forEach((keyword: string) => {
    if (useCase.includes(keyword)) {
      score += keyword.length; // Longer keywords get higher scores
    }
  });

  // Boost score for exact matches
  if (pattern.keywords.some((keyword: string) => useCase === keyword)) {
    score += 50;
  }

  // Boost score for multiple keyword matches
  const matchCount = pattern.keywords.filter((keyword: string) =>
    useCase.includes(keyword),
  ).length;

  if (matchCount > 1) {
    score += matchCount * 10;
  }

  return score;
}

function generateComponentStructure(
  pattern: any,
  useCase: string,
): ComponentSuggestion[] {
  const suggestions: ComponentSuggestion[] = [];

  // Generate hierarchical structure
  suggestions.push({
    component: "Page",
    reasoning: `Top-level container for ${useCase}`,
    props: {
      title: extractTitle(useCase),
    },
    children: ["Section"],
    confidence: 0.95,
  });

  suggestions.push({
    component: "Section",
    reasoning: `Main content section for ${pattern.pattern} interface`,
    children: pattern.components.filter(
      (c: string) => c !== "Page" && c !== "Section",
    ),
    confidence: 0.9,
  });

  // Add specific components based on pattern
  pattern.components.forEach((component: string) => {
    if (component !== "Page" && component !== "Section") {
      const capability = COMPONENT_CAPABILITIES[component];
      if (capability) {
        suggestions.push({
          component,
          reasoning: capability.purpose,
          bestFor: capability.bestFor,
          confidence: 0.8,
        });
      }
    }
  });

  return suggestions;
}

function generateFallbackSuggestions(useCase: string): ComponentSuggestion[] {
  // Always suggest basic page structure as fallback
  return [
    {
      component: "Page",
      reasoning: "Standard page container",
      props: { title: extractTitle(useCase) },
      children: ["Section"],
      confidence: 0.7,
    },
    {
      component: "Section",
      reasoning: "Content section container",
      children: ["Stack"],
      confidence: 0.7,
    },
    {
      component: "Stack",
      reasoning: "Flexible layout container",
      confidence: 0.6,
    },
  ];
}

function extractTitle(useCase: string): string {
  // Extract meaningful title from use case
  const words = useCase.split(/\s+/);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Load Polaris schema helper function
function loadPolarisSchema(): any {
  try {
    const { readFileSync } = require("fs");
    const { join } = require("path");
    const schemaPath = join(
      process.cwd(),
      "data",
      "polaris-web-components-schema.json",
    );
    return JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (error) {
    console.error("Failed to load Polaris schema:", error);
    return null;
  }
}

// Extract component info from schema definition
function extractComponentInfo(definition: any): ComponentInfo {
  return {
    tag: definition.properties?.tag?.const || "",
    description: definition.description || "No description available",
    attributes: definition.properties?.attributes?.properties || {},
    children: extractAllowedChildren(definition),
    source: "schema",
  };
}

// Enhanced component info with usage examples
export function getEnhancedComponentInfo(
  componentTag: string,
): ComponentInfo | null {
  const schema = loadPolarisSchema();
  if (!schema?.definitions) return null;

  // Find component by tag
  const component = Object.entries(schema.definitions).find(
    ([_, def]: [string, any]) => def.properties?.tag?.const === componentTag,
  );

  if (!component) return null;

  const [componentName, definition] = component;
  const capability = COMPONENT_CAPABILITIES[componentName];

  return {
    ...extractComponentInfo(definition),
    capability,
    usageExamples: generateUsageExamples(componentName, definition),
    relatedComponents: findRelatedComponents(componentName),
    bestPractices: getBestPractices(componentName),
  };
}

function generateUsageExamples(
  componentName: string,
  definition: any,
): string[] {
  const examples: string[] = [];
  const tag = definition.properties?.tag?.const;

  if (!tag) return examples;

  // Generate basic usage example
  examples.push(`<${tag}></${tag}>`);

  // Generate example with common props
  const attrs = definition.properties?.attributes?.properties;
  if (attrs) {
    const commonProps = Object.keys(attrs).slice(0, 2);
    if (commonProps.length > 0) {
      const propsString = commonProps
        .map((prop) => `${prop}="value"`)
        .join(" ");
      examples.push(`<${tag} ${propsString}></${tag}>`);
    }
  }

  // Add contextual examples based on component type
  if (componentName === "Button") {
    examples.push(`<${tag} variant="primary" tone="neutral">Click me</${tag}>`);
  } else if (componentName === "Page") {
    examples.push(
      `<${tag} title="Page Title"><s-section>Content</s-section></${tag}>`,
    );
  }

  return examples;
}

function findRelatedComponents(componentName: string): string[] {
  const capability = COMPONENT_CAPABILITIES[componentName];
  if (!capability?.children) return [];

  return capability.children;
}

function getBestPractices(componentName: string): string[] {
  const practices: Record<string, string[]> = {
    Page: [
      "Always include a meaningful title",
      "Use Section components for content organization",
      "Keep page structure semantic and accessible",
    ],
    Button: [
      "Use primary variant for main actions",
      'Include descriptive text, avoid "Click here"',
      "Consider tone for destructive actions (critical)",
    ],
    Table: [
      "Include proper headers for accessibility",
      "Use pagination for large datasets",
      "Provide sorting capabilities when helpful",
    ],
    Stack: [
      "Use appropriate gap values for spacing",
      "Consider responsive behavior",
      "Group related elements together",
    ],
  };

  return practices[componentName] || [];
}
