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
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { By } from 'selenium-webdriver';

// 生成元素的 XPath
function getXPath(element: Element): string {
  if (!element.parentElement) {
    return '/' + element.tagName.toLowerCase();
  }
  
  let siblings = Array.from(element.parentElement.children);
  let count = 0;
  let index = -1;
  
  for (let i = 0; i < siblings.length; i++) {
    if (siblings[i].tagName === element.tagName) {
      count++;
    }
    if (siblings[i] === element) {
      index = count;
    }
  }
  
  const position = count === 1 ? '' : `[${index}]`;
  return getXPath(element.parentElement) + '/' + element.tagName.toLowerCase() + position;
}

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

    case "visit_markdown_url": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      const userUrl = String(request.params.arguments?.url);
      if (!userUrl) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "URL 不能為空"
        );
      }

      try {
        // 組合 r.jina.ai URL
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(userUrl)}`;
        
        await activeDriver.get(jinaUrl);
        return {
          content: [{
            type: "text",
            text: `已成功轉換並訪問 Markdown 頁面: ${jinaUrl}`
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `訪問 Markdown 頁面失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "convert_to_markdown": {
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
        // 導航到URL
        await activeDriver.get(url);
        
        // 等待 JavaScript 加載（Github 頁面需要）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 獲取頁面HTML
        const html = await activeDriver.getPageSource();
        
        // 創建 Turndown 實例並轉換 HTML 為 Markdown
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        
        return {
          content: [{
            type: "text",
            text: markdown
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `轉換頁面為 Markdown 失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "convert_current_to_markdown": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      try {
        // 獲取當前頁面源代碼
        const html = await activeDriver.getPageSource();
        
        // 創建 Turndown 實例並轉換 HTML 為 Markdown
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        
        return {
          content: [{
            type: "text",
            text: markdown
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `轉換頁面為 Markdown 失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "text_input": {
      if (!activeDriver) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          "請先啟動瀏覽器會話"
        );
      }

      const { url, html, text } = request.params.arguments as { url: string; html: string; text: string };
      if (!url || !html || !text) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "URL、HTML 源代碼和輸入文字都不能為空"
        );
      }

      try {
        // 導航到指定頁面
        await activeDriver.get(url);
        
        // 等待頁面加載
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 使用 JSDOM 解析 HTML 源代碼
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const inputElement = doc.querySelector('input, textarea');

        if (!inputElement) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "無法在提供的 HTML 中找到輸入框元素"
          );
        }

        // 收集所有可能的定位資訊
        const selectors = [];
        
        // 1. ID 選擇器（最高優先級）
        if (inputElement.id) {
          selectors.push({
            type: By.css,
            value: `#${inputElement.id}`,
            priority: 1
          });
        }

        // 2. Name 屬性選擇器
        if (inputElement.getAttribute('name')) {
          selectors.push({
            type: By.css,
            value: `[name="${inputElement.getAttribute('name')}"]`,
            priority: 2
          });
        }

        // 3. XPath（基於元素的唯一路徑）
        const xpath = getXPath(inputElement);
        selectors.push({
          type: By.xpath,
          value: xpath,
          priority: 3
        });

        // 4. CSS 選擇器（基於 class）
        if (inputElement.className) {
          const classes = inputElement.className.split(' ').filter(Boolean);
          if (classes.length > 0) {
            selectors.push({
              type: By.css,
              value: '.' + classes.join('.'),
              priority: 4
            });
          }
        }

        // 5. 標籤名稱和type屬性組合
        const tagName = inputElement.tagName.toLowerCase();
        const type = inputElement.getAttribute('type');
        if (type) {
          selectors.push({
            type: By.css,
            value: `${tagName}[type="${type}"]`,
            priority: 5
          });
        } else {
          selectors.push({
            type: By.css,
            value: tagName,
            priority: 6
          });
        }

        // 按優先級排序選擇器
        selectors.sort((a, b) => a.priority - b.priority);

        // 嘗試所有定位策略
        let element = null;
        let lastError: Error | null = null;

        for (const selector of selectors) {
          try {
            element = await activeDriver.findElement(selector.type(selector.value));
            if (element) {
              break;
            }
          } catch (err) {
            lastError = err as Error;
            continue;
          }
        }

        if (!element) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `無法在頁面中找到匹配的輸入框元素: ${lastError ? lastError.message : '未知錯誤'}`
          );
        }
        
        // 清除現有內容並輸入新文字
        await element.clear();
        await element.sendKeys(text);
        
        return {
          content: [{
            type: "text",
            text: `已成功在輸入框中輸入文字: ${text}`
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `輸入文字失敗: ${err.message || '未知錯誤'}`
        );
      }
    }

    case "google_search_to_markdown": {
      const { keyword } = request.params.arguments as { keyword: string };
      if (!keyword) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "關鍵字不能為空"
        );
      }

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;

      try {
        // 啟動瀏覽器 (如果還沒啟動)
        if (!activeDriver) {
          const options = new firefox.Options();
          options.setBinary(FIREFOX_PATH);
          activeDriver = await new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(options)
            .build();
        }

        // 導航到 Google 搜尋 URL
        await activeDriver.get(searchUrl);

        // 等待頁面加載 (Google 搜尋結果頁面可能需要一些時間)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 檢查是否存在 Captcha
        const hasCaptcha = await activeDriver.findElements(By.css('form[action*="sorry"] iframe, #captcha-form')).then(elements => elements.length > 0);
        
        if (hasCaptcha) {
          return {
            content: [{
              type: "text",
              text: "檢測到 Google Captcha 驗證，請在瀏覽器中完成驗證後回覆"
            }],
            needsUserInput: true
          };
        }

        // 轉換為 Markdown
        const html = await activeDriver.getPageSource();
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        
        return {
          content: [{
            type: "text",
            text: markdown
          }]
        };
      } catch (err: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `Google 搜尋失敗: ${err.message || '未知錯誤'}`
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
