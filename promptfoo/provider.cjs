const { ChatOpenAI } = require("@langchain/openai");
const { MultiServerMCPClient } = require("@langchain/mcp-adapters");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");

const path = require("node:path");

const mcpPath = path.resolve(__dirname, "../dist/index.js");
if (!require("fs").existsSync(mcpPath)) {
  throw Error(
    `The file ${mcpPath} does not exist. Have you built the Dev MCP using \`npm run build\`?`,
  );
}

module.exports = class DevMCPProvider {
  constructor({ config }) {
    this.baseUrl =
      config.baseUrl ?? "https://proxy-shopify-ai.local.shop.dev/v1/";
    this.apiKey = config.apiKey ?? "dummy";
    this.model = config.model;
    this.systemPrompt = config.systemPrompt;

    this.llm = new ChatOpenAI({
      model: this.model,
      apiKey: this.apiKey,
      configuration: {
        baseURL: this.baseUrl,
      },
    });
  }

  id() {
    return "ShopifyProxyAgent";
  }

  async callApi(prompt, context, options) {
    const mcp = new MultiServerMCPClient({
      mcpServers: {
        devMcp: {
          command: "node",
          args: [mcpPath],
          transport: "stdio",
        },
      },
    });
    const mcpTools = await mcp.getTools();
    const agent = createReactAgent({
      llm: this.llm,
      tools: [...mcpTools],
      prompt: this.systemPrompt,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });
    await mcp.close();
    return {
      output: JSON.stringify(result),
    };
  }
};
