import { By } from 'selenium-webdriver';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from '../services/BrowserManager.js';
import { ElementLocator, ToolResponse } from '../types/types.js';
import { validateUrl, validateParam } from '../utils/errorHandling.js';
import { getElementLocators } from '../utils/xpath.js';
import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';

const FIREFOX_PATH = '/Applications/Firefox.app/Contents/MacOS/firefox';

export class BrowserTools {
  private static instance: BrowserTools;
  private browserManager: BrowserManager;

  private constructor() {
    this.browserManager = BrowserManager.getInstance({ binary: FIREFOX_PATH });
  }

  public static getInstance(): BrowserTools {
    if (!BrowserTools.instance) {
      BrowserTools.instance = new BrowserTools();
    }
    return BrowserTools.instance;
  }

  public async startBrowser(): Promise<ToolResponse> {
    await this.browserManager.start();
    return {
      content: [{
        type: "text",
        text: "Firefox 無頭瀏覽器已成功啟動"
      }]
    };
  }

  public async navigateTo(url: string): Promise<ToolResponse> {
    validateUrl(url);
    await this.browserManager.navigateTo(url);
    return {
      content: [{
        type: "text",
        text: `已成功導航到: ${url}`
      }]
    };
  }

  public async getPageTitle(): Promise<ToolResponse> {
    const title = await this.browserManager.getPageTitle();
    return {
      content: [{
        type: "text",
        text: `頁面標題: ${title}`
      }]
    };
  }

  public async getPageSource(): Promise<ToolResponse> {
    const source = await this.browserManager.getPageSource();
    return {
      content: [{
        type: "text",
        text: source
      }]
    };
  }

  public async downloadPage(filename?: string): Promise<ToolResponse> {
    const source = await this.browserManager.getPageSource();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `page-${timestamp}.html`;
    const finalFilename = filename || defaultFilename;
    
    const filepath = path.join(process.cwd(), 'downloads', finalFilename);
    
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
  }

  public async closeBrowser(): Promise<ToolResponse> {
    await this.browserManager.close();
    return {
      content: [{
        type: "text",
        text: "瀏覽器會話已關閉"
      }]
    };
  }

  public async inputText(url: string, html: string, text: string): Promise<ToolResponse> {
    validateParam(url, 'url');
    validateParam(html, 'html');
    validateParam(text, 'text');

    await this.browserManager.navigateTo(url);
    await this.browserManager.waitForLoad();

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const inputElement = doc.querySelector('input, textarea');

    if (!inputElement) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "無法在提供的 HTML 中找到輸入框元素"
      );
    }

    const locators = getElementLocators(inputElement);
    const elementLocators: ElementLocator[] = locators.map((value, index) => {
      const by = new By(value.startsWith('/') ? 'xpath' : 'css selector', value);
      return {
        by,
        value,
        priority: index
      };
    });

    const element = await this.browserManager.findElement(elementLocators);
    await element.clear();
    await element.sendKeys(text);

    return {
      content: [{
        type: "text",
        text: `已成功在輸入框中輸入文字: ${text}`
      }]
    };
  }
}