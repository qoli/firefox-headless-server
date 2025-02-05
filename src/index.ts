#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { Builder, Browser, WebDriver } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import fs from 'fs/promises';
import path from 'path';

// Firefox 瀏覽器路徑配置
const FIREFOX_PATH = '/Applications/Firefox.app/Contents/MacOS/firefox';

// 存儲活動的瀏覽器會話
let activeDriver: WebDriver | null = null;

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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
      }
    ]
  };
});

// 處理工具調用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "start_browser": {
      if (activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "瀏覽器會話已經存在"
        );
      }

      const options = new firefox.Options();
      options.addArguments("-headless");
      options.setBinary(FIREFOX_PATH);
      
      try {
        activeDriver = await new Builder()
          .forBrowser(Browser.FIREFOX)
          .setFirefoxOptions(options)
          .build();

        return {
          content: [{
            type: "text",
            text: "Firefox 無頭瀏覽器已成功啟動"
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `啟動瀏覽器失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "navigate_to": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      const url = String(request.params.arguments?.url);
      if (!url) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "URL 不能為空"
        );
      }

      try {
        await activeDriver.get(url);
        return {
          content: [{
            type: "text",
            text: `已成功導航到: ${url}`
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `導航失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "get_page_title": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      try {
        const title = await activeDriver.getTitle();
        return {
          content: [{
            type: "text",
            text: `頁面標題: ${title}`
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `獲取頁面標題失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "get_page_source": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      try {
        const source = await activeDriver.getPageSource();
        return {
          content: [{
            type: "text",
            text: source
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `獲取頁面源代碼失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "download_page": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      try {
        const source = await activeDriver.getPageSource();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = String(request.params.arguments?.filename || `page-${timestamp}.html`);
        const filepath = path.join(process.cwd(), 'downloads', filename);
        
        // 確保下載目錄存在
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        
        // 寫入文件
        await fs.writeFile(filepath, source, 'utf-8');

        return {
          content: [{
            type: "text",
            text: `頁面已成功下載到: ${filepath}`
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `下載頁面失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "close_browser": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "沒有活動的瀏覽器會話"
        );
      }

      try {
        await activeDriver.quit();
        activeDriver = null;
        return {
          content: [{
            type: "text",
            text: "瀏覽器會話已關閉"
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `關閉瀏覽器失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `未知的工具: ${String(request.params.name)}`
      );
  }
});

// 錯誤處理
process.on('unhandledRejection', (reason: any) => {
  console.error('未處理的 Promise 拒絕:', reason);
  if (activeDriver) {
    activeDriver.quit().catch(() => {});
  }
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
  if (activeDriver) {
    activeDriver.quit().catch(() => {});
  }
  process.exit(1);
});
