import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from '../services/BrowserManager.js';
import { MarkdownConverter } from '../services/MarkdownConverter.js';
import { ToolResponse } from '../types/types.js';
import { validateUrl } from '../utils/errorHandling.js';

const FIREFOX_PATH = '/Applications/Firefox.app/Contents/MacOS/firefox';

export class MarkdownTools {
  private static instance: MarkdownTools;
  private browserManager: BrowserManager;
  private markdownConverter: MarkdownConverter;

  private constructor() {
    this.browserManager = BrowserManager.getInstance({ binary: FIREFOX_PATH });
    this.markdownConverter = MarkdownConverter.getInstance({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  public static getInstance(): MarkdownTools {
    if (!MarkdownTools.instance) {
      MarkdownTools.instance = new MarkdownTools();
    }
    return MarkdownTools.instance;
  }

  public async convertCurrentToMarkdown(): Promise<ToolResponse> {
    const html = await this.browserManager.getPageSource();
    const markdown = this.markdownConverter.convertHtmlToMarkdown(html);
    
    return {
      content: [{
        type: "text",
        text: markdown
      }]
    };
  }

  public async visitMarkdownUrl(url: string): Promise<ToolResponse> {
    validateUrl(url);
    
    // 組合 r.jina.ai URL
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    
    await this.browserManager.navigateTo(jinaUrl);
    
    return {
      content: [{
        type: "text",
        text: `已成功轉換並訪問 Markdown 頁面: ${jinaUrl}`
      }]
    };
  }

  public async convertToMarkdown(url: string): Promise<ToolResponse> {
    validateUrl(url);

    // 導航到URL
    await this.browserManager.navigateTo(url);
    
    // 等待頁面加載（Github 頁面需要）
    await this.browserManager.waitForLoad(2000);
    
    // 獲取頁面HTML並轉換
    const html = await this.browserManager.getPageSource();
    const markdown = this.markdownConverter.convertHtmlToMarkdown(html);
    
    return {
      content: [{
        type: "text",
        text: markdown
      }]
    };
  }
}