# Shopify Dev MCP Server

This project implements a Model Context Protocol (MCP) server that interacts with Shopify Dev. This protocol supports various tools to interact with different Shopify APIs. At the moment the following APIs are supported:

- Admin GraphQL API
- Functions
- (Optional) Polaris Web Components
- (Optional) Liquid/Theme validation

## Setup

To run the Shopify MCP server using npx, use the following command:

```bash
npx -y @shopify/dev-mcp@latest
```

## Usage with Cursor or Claude Desktop

Add the following configuration. For more information, read the [Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol) or the [Claude Desktop MCP guide](https://modelcontextprotocol.io/quickstart/user).

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=shopify-dev-mcp&config=eyJjb21tYW5kIjoibnB4IC15IEBzaG9waWZ5L2Rldi1tY3BAbGF0ZXN0In0%3D)

On Windows, you might need to use this alternative configuration:

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "cmd",
      "args": ["/k", "npx", "-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=shopify-dev-mcp&config=eyJjb21tYW5kIjoiY21kIC9rIG5weCAteSBAc2hvcGlmeS9kZXYtbWNwQGxhdGVzdCJ9)

### Disable instrumentation

In order to better understand how to improve the MCP server, this package makes instrumentation calls. In order to disable them you can set the `OPT_OUT_INSTRUMENTATION` environment variable. In Cursor or Claude Desktop the configuration would look like this:

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"],
      "env": {
        "OPT_OUT_INSTRUMENTATION": "true"
      }
    }
  }
}
```

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=shopify-dev-mcp&config=eyJjb21tYW5kIjoibnB4IC15IEBzaG9waWZ5L2Rldi1tY3BAbGF0ZXN0IiwiZW52Ijp7Ik9QVF9PVVRfSU5TVFJVTUVOVEFUSU9OIjoidHJ1ZSJ9fQ%3D%3D)

### Opt-in Polaris support (experimental)

If you want Cursor or Claude Desktop to surface Polaris Web Components documentation, include an `env` block with the `POLARIS_UNIFIED` flag in your MCP server configuration:

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"],
      "env": {
        "POLARIS_UNIFIED": "true"
      }
    }
  }
}
```

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=shopify-dev-mcp&config=eyJjb21tYW5kIjoibnB4IC15IEBzaG9waWZ5L2Rldi1tY3BAbGF0ZXN0IiwiZW52Ijp7IlBPTEFSSVNfVU5JRklFRCI6InRydWUifX0%3D)

### Opt-in Liquid/Theme validation support (experimental)

If you want Cursor or Claude Desktop to validate Liquid code and theme files, include an `env` block with the `LIQUID` flag in your MCP server configuration:

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"],
      "env": {
        "LIQUID": "true"
      }
    }
  }
}
```

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=shopify-dev-mcp&config=eyJjb21tYW5kIjoibnB4IC15IEBzaG9waWZ5L2Rldi1tY3BAbGF0ZXN0IiwiZW52Ijp7IkxJUVVJRCI6InRydWUifX0%3D)

You can also control the validation mode by setting `LIQUID_VALIDATION_MODE`:

- `"full"` (default): Enables the `validate_theme` tool for validating entire theme directories
- `"partial"`: Enables the `validate_theme_codeblocks` tool for validating individual codeblocks

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"],
      "env": {
        "LIQUID": "true",
        "LIQUID_VALIDATION_MODE": "partial"
      }
    }
  }
}
```

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=shopify-dev-mcp&config=eyJjb21tYW5kIjoibnB4IC15IEBzaG9waWZ5L2Rldi1tY3BAbGF0ZXN0IiwiZW52Ijp7IkxJUVVJRCI6InRydWUiLCJMSVFVSURfVkFMSURBVElPTl9NT0RFIjoicGFydGlhbCJ9fQ%3D%3D)

## Available tools

This MCP server provides the following tools:

| Tool Name                   | Description                                                                                                                                                                                                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| learn_shopify_api           | **Start here first** - Teaches the LLM about supported Shopify APIs and how to use this MCP server's tools to generate valid code blocks for each API. This tool makes a request to shopify.dev to get the most up-to-date instruction for how to best work with the API the user would need to use for their prompt. |
| search_docs_chunks          | Search across all shopify.dev documentation to find relevant chunks matching your query. Useful for getting content from many different documentation categories, but may have incomplete context due to chunking                                                                                                     |
| fetch_full_docs             | Retrieve complete documentation for specific paths from shopify.dev. Provides full context without chunking loss, but requires knowing the exact path. Paths are provided via `learn_shopify_api`                                                                                                                     |
| introspect_graphql_schema   | Explore and search Shopify GraphQL schemas to find specific types, queries, and mutations. Returns schema elements filtered by search terms, helping developers discover available fields, operations, and data structures for building GraphQL operations                                                            |
| validate_graphql_codeblocks | Validate GraphQL code blocks against a specific GraphQL schema to ensure they don't contain hallucinated fields or operations                                                                                                                                                                                         |
| validate_theme_codeblocks   | (When `LIQUID=true` and `LIQUID_VALIDATION_MODE=partial`) Validates individual Liquid codeblocks and supporting theme files (JSON, CSS, JS, SVG) to ensure correct syntax and references                                                                                                                              |
| validate_theme              | (When `LIQUID=true` and `LIQUID_VALIDATION_MODE=full`) Validates entire theme directories using Shopify's Theme Check to detect errors in Liquid syntax, missing references, and other theme issues                                                                                                                   |

## Tool Usage Guidelines

### When to use each documentation tool

- **`learn_shopify_api`**: Always call this first when working with Shopify APIs. It provides essential context about supported APIs and generates a conversation ID for tracking usage across tool calls.

- **`search_docs_chunks`**: Use when you need to find relevant information across multiple documentation sections or when you don't know the specific path. This tool searches through chunked content which allows for better token matching within smaller content pieces, but may miss some context from individual pages.

- **`fetch_full_docs`**: Use when you need complete documentation for a specific API resource and know the exact path (e.g., `/docs/api/admin-rest/resources/product`). This provides full context without any information loss from chunking.

### When to use theme validation tools (requires `LIQUID=true`)

- **`validate_theme_codeblocks`**: Use when generating or modifying individual Liquid files or codeblocks. This tool validates syntax, checks for undefined objects/filters, and ensures references to other files exist. Perfect for incremental development and quick validation of code snippets.

- **`validate_theme`**: Use when working with complete theme directories to validate all files at once. This comprehensive validation catches cross-file issues, ensures consistency across the theme, and applies all Theme Check rules.

## Available prompts

This MCP server provides the following prompts:

| Prompt Name           | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| shopify_admin_graphql | Help you write GraphQL operations for the Shopify Admin API |

## Development

The server is built using the MCP SDK and communicates with Shopify Dev.

1. `npm install`
1. Modify source files
1. Run `npm run build` to compile or `npm run build:watch` to watch for changes and compile
1. Run `npm run test` to run tests
1. Add an MCP server that runs this command: `node <absolute_path_of_project>/dist/index.js`

## License

ISC
