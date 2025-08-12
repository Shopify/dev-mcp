const { ChatOpenAI } = require("@langchain/openai");
const { MultiServerMCPClient } = require("@langchain/mcp-adapters");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const {
  isHumanMessage,
  isAIMessage,
  isToolMessage,
} = require("@langchain/core/messages");

const path = require("node:path");
const fs = require("fs");
const mcpPath = resolveFileUrl("file://../dist/index.js");

module.exports = class DevMCPProvider {
  constructor({ config }) {
    this.baseUrl =
      config.baseUrl ?? "https://proxy-shopify-ai.local.shop.dev/v1/";
    this.apiKey = config.apiKey ?? "dummy";
    this.model = config.model;
    this.systemPromptFactory = loadPrompt(config.systemPrompt);

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
    const prompts = await this.systemPromptFactory({ prompt, mcpTools });

    const agent = createReactAgent({
      llm: this.llm,
      tools: [...mcpTools],
      prompt: prompts.systemPrompt,
    });

    const result = await agent.invoke(
      {
        messages: prompts.messages,
      },
      {
        recursionLimit: 1000,
        streamMode: "values",
      },
    );
    await mcp.close();
    return {
      output: formatResult(result),
    };
  }
};

function loadPrompt(systemPrompt) {
  if (!systemPrompt.startsWith("file://"))
    return ({ prompt }) => ({
      systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
  const fullPath = resolveFileUrl(systemPrompt);
  return require(fullPath);
}

function resolveFileUrl(url) {
  const fullPath = path.resolve(__dirname, url.slice("file://".length));
  if (!fs.existsSync(fullPath)) {
    throw Error(`The file ${fullPath} does not exist.`);
  }
  return fullPath;
}

function formatToolCall(tool) {
  let str = `Called tool ${tool.name}`;
  if (Object.keys(tool.args ?? {}).length > 0) {
    str += ` with arguments: ${JSON.stringify(tool.args)}`;
  }
  return str;
}

function formatResult(conversation) {
  return conversation.messages
    .flatMap((msg) => {
      if (isAIMessage(msg)) {
        return [
          ...(msg.content ? [`agent: ${msg.content}`] : []),
          ...(msg.tool_calls ?? []).map((tool) => formatToolCall(tool)),
        ];
      }
      if (isToolMessage(msg)) {
        return msg.content.split("\n").slice(0, 3).join("\n");
      }
      // TODO: Other cases that need handling?
      return [];
    })
    .join("\n");
}
