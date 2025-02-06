#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { BrowserTools } from './tools/browserTools.js';
import { MarkdownTools } from './tools/markdownTools.js';
import { SearchTools } from './tools/searchTools.js';
import { validateParam } from './utils/errorHandling.js';
import { ToolResponse } from './types/types.js';

// 初始化工具類實例
const browserTools = BrowserTools.getInstance();
const markdownTools = MarkdownTools.getInstance();
const searchTools = SearchTools.getInstance();

const server = new Server(
  {
    name: "firefox-headless-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用的工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "convert_current_to_markdown",
      description: "將當前瀏覽器頁面轉換為 Markdown 格式",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "start_browser",
      description: "啟動一個新的 Firefox 無頭瀏覽器會話",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "navigate_to",
      description: "導航到指定的 URL",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "要訪問的網頁 URL"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "get_page_title",
      description: "獲取當前頁面的標題",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_page_source",
      description: "獲取當前頁面的源代碼",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "download_page",
      description: "下載當前頁面到指定路徑",
      inputSchema: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "保存的文件名(可選，默認使用當前時間戳)"
          }
        },
        required: []
      }
    },
    {
      name: "close_browser",
      description: "關閉瀏覽器會話",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "visit_markdown_url",
      description: "將網頁轉換為 Markdown 格式查看(使用 r.jina.ai)",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "要轉換的網頁 URL"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "convert_to_markdown",
      description: "使用 Turndown 將網頁轉換為 Markdown 格式",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "要轉換的網頁 URL"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "google_search_to_markdown",
      description: "使用 Google 搜尋並將結果轉換為 Markdown",
      inputSchema: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "要搜尋的關鍵字",
          },
        },
        required: ["keyword"],
      },
    },
    {
      name: "text_input",
      description: "在指定網頁的輸入框中輸入文字",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "要訪問的網頁 URL"
          },
          html: {
            type: "string",
            description: "輸入框的 HTML 源代碼"
          },
          text: {
            type: "string",
            description: "要輸入的文字"
          }
        },
        required: ["url", "html", "text"]
      }
    }
  ]
}));

// 處理工具調用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  let response: ToolResponse;

  try {
    switch (request.params.name) {
      case "start_browser":
        response = await browserTools.startBrowser();
        break;

      case "navigate_to": {
        const url = String(request.params.arguments?.url);
        validateParam(url, 'url');
        response = await browserTools.navigateTo(url);
        break;
      }

      case "get_page_title":
        response = await browserTools.getPageTitle();
        break;

      case "get_page_source":
        response = await browserTools.getPageSource();
        break;

      case "download_page": {
        const filename = request.params.arguments?.filename as string | undefined;
        response = await browserTools.downloadPage(filename);
        break;
      }

      case "close_browser":
        response = await browserTools.closeBrowser();
        break;

      case "visit_markdown_url": {
        const url = String(request.params.arguments?.url);
        validateParam(url, 'url');
        response = await markdownTools.visitMarkdownUrl(url);
        break;
      }

      case "convert_to_markdown": {
        const url = String(request.params.arguments?.url);
        validateParam(url, 'url');
        response = await markdownTools.convertToMarkdown(url);
        break;
      }

      case "convert_current_to_markdown":
        response = await markdownTools.convertCurrentToMarkdown();
        break;

      case "text_input": {
        const { url, html, text } = request.params.arguments as { 
          url: string; 
          html: string; 
          text: string 
        };
        response = await browserTools.inputText(url, html, text);
        break;
      }

      case "google_search_to_markdown": {
        const { keyword } = request.params.arguments as { keyword: string };
        validateParam(keyword, '關鍵字');
        response = await searchTools.googleSearchToMarkdown(keyword);
        break;
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知的工具: ${String(request.params.name)}`
        );
    }

    return response;
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `執行錯誤: ${(error as Error).message || '未知錯誤'}`
    );
  }
});

// 錯誤處理
process.on('unhandledRejection', async (reason: any) => {
  console.error('未處理的 Promise 拒絕:', reason);
  const driver = await BrowserTools.getInstance().closeBrowser().catch(() => {});
  process.exit(1);
});

// 啟動服務器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Firefox Headless MCP 服務器已啟動');
}

main().catch((err: any) => {
  console.error("服務器錯誤:", err);
  BrowserTools.getInstance().closeBrowser().catch(() => {});
  process.exit(1);
});
