# Shopify Dev MCP Server

This project implements a Model Context Protocol (MCP) server that interacts with Shopify Dev. This protocol supports various tools to interact with different Shopify APIs.

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

## Available tools

This MCP server provides the following tools:

| Tool Name               | Description                                    |
| ----------------------- | ---------------------------------------------- |
| search-dev-docs         | Search shopify.dev documentation               |
| introspect-admin-schema | Access and search Shopify Admin GraphQL schema |
| fetch-github-issues     | Retrieve issues from Shopify GitHub repositories |

### GitHub Integration

The `fetch-github-issues` tool retrieves a specific GitHub issue by number from a Shopify repository.


## Available prompts

This MCP server provides the following prompts:

| Prompt Name           | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| shopify-admin-graphql | Help you write GraphQL operations for the Shopify Admin API |

## Development

The server is built using the MCP SDK and communicates with Shopify Dev.

1. `npm install`
1. Modify source files
1. Run `npm run build` to compile
1. Run `npm run test` to run tests
1. Add an MCP server that runs this command: `node <absolute_path_of_project>/dist/index.js`

## License

ISC
