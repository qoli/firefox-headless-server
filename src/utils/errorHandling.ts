import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ErrorResult } from '../types/types.js';

/**
 * 創建一個標準化的錯誤響應
 * @param code - 錯誤代碼
 * @param message - 錯誤信息
 * @returns ErrorResult 對象
 */
export function createError(code: ErrorCode, message: string): ErrorResult {
  return {
    error: new McpError(code, message),
    message: message
  };
}

/**
 * 包裝異步函數以統一錯誤處理
 * @param fn - 要執行的異步函數 
 * @returns Promise<T | ErrorResult>
 */
export async function handleAsyncError<T>(
  fn: () => Promise<T>
): Promise<T | ErrorResult> {
  try {
    return await fn();
  } catch (err: any) {
    const message = err.message || '未知錯誤';
    if (err instanceof McpError) {
      return createError(err.code, message);
    }
    return createError(ErrorCode.InternalError, message);
  }
}

/**
 * 檢查操作的前置條件
 * @param condition - 要檢查的條件
 * @param errorMessage - 條件不滿足時的錯誤信息
 * @throws McpError 如果條件不滿足
 */
export function precondition(condition: boolean, errorMessage: string): void {
  if (!condition) {
    throw new McpError(ErrorCode.InvalidRequest, errorMessage);
  }
}

/**
 * 檢查參數是否有效
 * @param param - 要檢查的參數
 * @param paramName - 參數名稱
 * @throws McpError 如果參數無效
 */
export function validateParam(param: any, paramName: string): void {
  if (param === undefined || param === null || param === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      `參數 ${paramName} 不能為空`
    );
  }
}

/**
 * 處理瀏覽器相關錯誤
 * @param error - 錯誤對象
 * @param operation - 操作名稱
 * @returns ErrorResult
 */
export function handleBrowserError(error: any, operation: string): ErrorResult {
  const baseMessage = `${operation}失敗`;
  const errorMessage = error.message || '未知錯誤';
  return createError(
    ErrorCode.InternalError,
    `${baseMessage}: ${errorMessage}`
  );
}

/**
 * 檢查 URL 是否有效
 * @param url - 要檢查的 URL
 * @returns boolean
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 驗證 URL 並拋出錯誤（如果無效）
 * @param url - 要驗證的 URL
 * @throws McpError 如果 URL 無效
 */
export function validateUrl(url: string): void {
  if (!isValidUrl(url)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      '無效的 URL 格式'
    );
  }
}