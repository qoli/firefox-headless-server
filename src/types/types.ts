import { WebDriver, By } from 'selenium-webdriver';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

// 瀏覽器相關類型
export interface BrowserOptions {
  binary: string;
  headless?: boolean;
}

// 元素定位器類型
export interface ElementLocator {
  by: By;
  value: string;
  priority: number;
}

// 工具响應類型
export interface ToolContent {
  type: string;
  text: string;
}

export interface ToolResponse {
  _meta?: { progressToken?: string | number };
  content: ToolContent[];
  needsUserInput?: boolean;
  waitForResponse?: boolean;
}

// Google 搜尋結果類型
export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

// 錯誤處理類型
export interface ErrorResult {
  error: McpError;
  message: string;
}

// Markdown 轉換選項
export interface MarkdownOptions {
  headingStyle?: 'setext' | 'atx';
  codeBlockStyle?: 'indented' | 'fenced';
  ignoreElements?: string[];
}