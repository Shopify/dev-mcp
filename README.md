# Shopify Dev MCP Server

This project implements a Model Context Protocol (MCP) server that interacts with Shopify Dev. This protocol supports various tools to interact with different Shopify APIs. At the moment the following APIs are supported:

- Admin GraphQL API
- Functions
- (Optional) Polaris Web Components

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

## Available tools

This MCP server provides the following tools:

| Tool Name               | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| search_dev_docs         | Search shopify.dev documentation                       |
| introspect_admin_schema | Access and search Shopify Admin GraphQL schema         |
| fetch_docs_by_path      | Retrieve documents from shopify.dev                    |
| get_started             | Get started with Shopify APIs (Admin, Functions, etc.) |

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
