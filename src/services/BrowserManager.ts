import { Builder, WebDriver, Browser, WebElement } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { BrowserOptions, ElementLocator } from '../types/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class BrowserManager {
  private static instance: BrowserManager;
  private driver: WebDriver | null = null;
  private readonly defaultBinary: string;

  private constructor(options: BrowserOptions) {
    this.defaultBinary = options.binary;
  }

  public static getInstance(options: BrowserOptions): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager(options);
    }
    return BrowserManager.instance;
  }

  public async getDriver(): Promise<WebDriver> {
    if (!this.driver) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        '瀏覽器會話尚未啟動'
      );
    }
    return this.driver;
  }

  public async start(): Promise<void> {
    if (this.driver) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        '瀏覽器會話已經存在'
      );
    }

    const options = new firefox.Options();
    options.setBinary(this.defaultBinary);
    
    try {
      this.driver = await new Builder()
        .forBrowser(Browser.FIREFOX)
        .setFirefoxOptions(options)
        .build();
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `啟動瀏覽器失敗: ${err.message || '未知錯誤'}`
      );
    }
  }

  public async navigateTo(url: string): Promise<void> {
    const driver = await this.getDriver();
    try {
      await driver.get(url);
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `導航失敗: ${err.message || '未知錯誤'}`
      );
    }
  }

  public async getPageTitle(): Promise<string> {
    const driver = await this.getDriver();
    try {
      return await driver.getTitle();
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `獲取頁面標題失敗: ${err.message || '未知錯誤'}`
      );
    }
  }

  public async getPageSource(): Promise<string> {
    const driver = await this.getDriver();
    try {
      return await driver.getPageSource();
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `獲取頁面源代碼失敗: ${err.message || '未知錯誤'}`
      );
    }
  }

  public async findElement(locators: ElementLocator[]): Promise<WebElement> {
    const driver = await this.getDriver();
    let lastError: Error | null = null;

    for (const locator of locators) {
      try {
        const element = await driver.findElement(locator.by);
        if (element) {
          return element;
        }
      } catch (err) {
        lastError = err as Error;
        continue;
      }
    }

    throw new McpError(
      ErrorCode.InvalidRequest,
      `無法在頁面中找到匹配的元素: ${lastError ? lastError.message : '未知錯誤'}`
    );
  }

  public async close(): Promise<void> {
    if (!this.driver) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        '沒有活動的瀏覽器會話'
      );
    }

    try {
      await this.driver.quit();
      this.driver = null;
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `關閉瀏覽器失敗: ${err.message || '未知錯誤'}`
      );
    }
  }

  public async waitForLoad(ms: number = 2000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}