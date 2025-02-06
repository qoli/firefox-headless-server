import { By } from 'selenium-webdriver';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from '../services/BrowserManager.js';
import { MarkdownConverter } from '../services/MarkdownConverter.js';
import { ToolResponse } from '../types/types.js';
import { validateParam } from '../utils/errorHandling.js';

const FIREFOX_PATH = '/Applications/Firefox.app/Contents/MacOS/firefox';

export class SearchTools {
  private static instance: SearchTools;
  private browserManager: BrowserManager;
  private markdownConverter: MarkdownConverter;

  private constructor() {
    this.browserManager = BrowserManager.getInstance({ binary: FIREFOX_PATH });
    this.markdownConverter = MarkdownConverter.getInstance();
  }

  public static getInstance(): SearchTools {
    if (!SearchTools.instance) {
      SearchTools.instance = new SearchTools();
    }
    return SearchTools.instance;
  }

  private async checkForCaptcha(): Promise<boolean> {
    const driver = await this.browserManager.getDriver();
    const captchaElements = await driver.findElements(By.css('form[action*="sorry"] iframe, #captcha-form'));
    return captchaElements.length > 0;
  }

  public async googleSearchToMarkdown(keyword: string): Promise<ToolResponse> {
    validateParam(keyword, '關鍵字');

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
    
    // 導航到 Google 搜尋 URL
    await this.browserManager.navigateTo(searchUrl);
    
    // 等待頁面加載
    await this.browserManager.waitForLoad(3000);
    
    // 檢查是否存在 Captcha
    const hasCaptcha = await this.checkForCaptcha();
    if (hasCaptcha) {
      return {
        content: [{
          type: "text",
          text: "使用 ask_followup_question 工具向用戶詢問：「檢測到 Google 驗證，請在瀏覽器中完成驗證後，輸入「完成」繼續」"
        }],
        needsUserInput: true,
        waitForResponse: true
      };
    }
    
    // 再次檢查驗證碼
    await this.browserManager.waitForLoad(2000);
    const stillHasCaptcha = await this.checkForCaptcha();
    if (stillHasCaptcha) {
      return {
        content: [{
          type: "text",
          text: "請完成 Google 驗證後輸入「完成」繼續"
        }],
        needsUserInput: true,
        waitForResponse: true
      };
    }
    
    // 獲取頁面內容並轉換為 Markdown
    const html = await this.browserManager.getPageSource();
    const markdown = this.markdownConverter.convertHtmlToMarkdown(html);
    
    if (!markdown) {
      return {
        content: [{
          type: "text",
          text: "請完成 Google 驗證後輸入「完成」繼續"
        }],
        needsUserInput: true,
        waitForResponse: true
      };
    }
    
    // 解析搜尋結果
    const searchResults = this.markdownConverter.parseSearchResults(markdown);
    
    // 生成最終的 Markdown 文檔
    const finalMarkdown = this.markdownConverter.createSearchResultMarkdown(
      searchResults,
      markdown
    );
    
    return {
      content: [{
        type: "text",
        text: finalMarkdown
      }]
    };
  }
}