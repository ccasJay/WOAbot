/**
 * Perplexity API 客户端
 * 
 * 实现与 Perplexity Sonar API 的交互，包括搜索、重试和响应解析
 */

import { PerplexityConfig, PerplexityResponse, PerplexityApiError } from '@/types';

const DEFAULT_MODEL = 'sonar';
const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Perplexity API 原始响应结构
 */
interface PerplexityRawResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 解析 Perplexity API 响应
 */
export function parsePerplexityResponse(raw: PerplexityRawResponse): PerplexityResponse {
  const content = raw.choices?.[0]?.message?.content ?? '';
  const citations = raw.citations ?? [];
  const usage = {
    promptTokens: raw.usage?.prompt_tokens ?? 0,
    completionTokens: raw.usage?.completion_tokens ?? 0,
    totalTokens: raw.usage?.total_tokens ?? 0,
  };

  return { content, citations, usage };
}

/**
 * 计算指数退避延迟时间
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = BASE_DELAY_MS): number {
  return baseDelay * Math.pow(2, attempt);
}

/**
 * 延迟执行
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Perplexity API 客户端类
 */
export class PerplexityClient {
  private apiKey: string;
  private model: string;
  private maxRetries: number;

  constructor(config: PerplexityConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * 搜索并生成内容
   */
  async search(prompt: string): Promise<PerplexityResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(PERPLEXITY_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          const statusCode = response.status;
          const retryable = statusCode >= 500 || statusCode === 429;
          
          if (statusCode === 401) {
            throw new PerplexityApiError('API 密钥无效', statusCode, false);
          }

          if (!retryable || attempt === this.maxRetries - 1) {
            throw new PerplexityApiError(
              `API 请求失败: ${response.statusText}`,
              statusCode,
              retryable
            );
          }

          lastError = new PerplexityApiError(
            `API 请求失败: ${response.statusText}`,
            statusCode,
            retryable
          );
        } else {
          const rawResponse: PerplexityRawResponse = await response.json();
          return parsePerplexityResponse(rawResponse);
        }
      } catch (error) {
        if (error instanceof PerplexityApiError && !error.retryable) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // 指数退避延迟
      if (attempt < this.maxRetries - 1) {
        const delayMs = calculateBackoffDelay(attempt);
        await delay(delayMs);
      }
    }

    throw lastError ?? new PerplexityApiError('API 调用失败', 500, false);
  }

  /**
   * 验证 API 密钥有效性
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.search('test');
      return true;
    } catch (error) {
      if (error instanceof PerplexityApiError && error.statusCode === 401) {
        return false;
      }
      // 其他错误可能是网络问题，不一定是密钥无效
      throw error;
    }
  }
}

/**
 * 创建 Perplexity 客户端实例
 */
export function createPerplexityClient(config: PerplexityConfig): PerplexityClient {
  return new PerplexityClient(config);
}
