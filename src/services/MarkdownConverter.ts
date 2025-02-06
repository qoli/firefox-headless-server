import TurndownService from 'turndown';
import { MarkdownOptions, SearchResult } from '../types/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class MarkdownConverter {
  private static instance: MarkdownConverter;
  private turndownService: TurndownService;

  private constructor(options?: MarkdownOptions) {
    this.turndownService = new TurndownService({
      headingStyle: options?.headingStyle || 'atx',
      codeBlockStyle: options?.codeBlockStyle || 'fenced'
    });

    // 設置默認忽略的元素
    const defaultIgnore = ['script', 'style', 'noscript'] as const;
    defaultIgnore.forEach(tag => this.turndownService.remove(tag));
    
    if (options?.ignoreElements) {
      options.ignoreElements.forEach(tag => 
        this.turndownService.remove(tag as keyof HTMLElementTagNameMap)
      );
    }
  }

  public static getInstance(options?: MarkdownOptions): MarkdownConverter {
    if (!MarkdownConverter.instance) {
      MarkdownConverter.instance = new MarkdownConverter(options);
    }
    return MarkdownConverter.instance;
  }

  public convertHtmlToMarkdown(html: string): string {
    try {
      return this.turndownService.turndown(html);
    } catch (err: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `HTML 轉換 Markdown 失敗: ${err.message || '未知錯誤'}`
      );
    }
  }

  public parseSearchResults(markdown: string): SearchResult[] {
    const lines = markdown.split('\n');
    const searchResults: SearchResult[] = [];
    let currentResult: Partial<SearchResult> | null = null;

    for (const line of lines) {
      // 識別標題
      if (line.startsWith('# ') || line.startsWith('## ')) {
        if (currentResult?.title && currentResult?.url) {
          searchResults.push(currentResult as SearchResult);
        }
        currentResult = {
          title: line.replace(/^#+ /, ''),
          url: '',
          description: ''
        };
      }
      // 識別連結
      else if (line.startsWith('[') && line.includes('](') && currentResult) {
        const matches = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (matches) {
          currentResult.url = matches[2];
        }
      }
      // 累積描述文本
      else if (line.trim() && currentResult) {
        if (!currentResult.description || currentResult.description.length < 200) {
          currentResult.description = currentResult.description 
            ? `${currentResult.description} ${line.trim()}`
            : line.trim();
        }
      }
    }

    // 添加最後一個結果
    if (currentResult?.title && currentResult?.url) {
      searchResults.push(currentResult as SearchResult);
    }

    return searchResults;
  }

  public formatSearchResults(results: SearchResult[]): string {
    const summaries = results
      .map(result => `## ${result.title}\n- URL: ${result.url}\n- 摘要: ${result.description}\n`)
      .join('\n');

    return `# 搜尋結果摘要\n\n${summaries}`;
  }

  // 將搜尋結果轉換為完整的 Markdown 格式
  public createSearchResultMarkdown(results: SearchResult[], fullMarkdown: string): string {
    const summary = this.formatSearchResults(results);
    return `${summary}\n\n# 完整搜尋結果\n\n${fullMarkdown}`;
  }
}