/**
 * 核心数据类型定义
 * 
 * 本文件定义了系统中所有核心数据结构和错误类型
 */

// ============================================================================
// 数据模型
// ============================================================================

/**
 * 搜索主题
 */
export interface Topic {
  id: string;           // UUID
  name: string;         // 主题名称
  keywords: string;     // 搜索关键词
  enabled: boolean;     // 是否启用
  createdAt: string;    // ISO 时间
  updatedAt: string;    // ISO 时间
}

/**
 * 文章
 */
export interface Article {
  id: string;           // UUID
  title: string;        // 文章标题
  content: string;      // Markdown 内容
  htmlContent: string;  // HTML 内容
  digest: string;       // 摘要（100字以内）
  citations: string[];  // 来源链接
  status: 'generated' | 'pushed' | 'failed';
  mediaId?: string;     // 微信草稿 ID
  tokensUsed: number;   // API token 用量
  createdAt: string;    // 生成时间
  pushedAt?: string;    // 推送时间
  error?: string;       // 错误信息
}

/**
 * 调度模式
 * - daily: 每日执行
 * - interval: 间隔天数执行
 * - weekly: 每周指定日期执行
 * - custom: 自定义 cron 表达式
 */
export type ScheduleMode = 'daily' | 'interval' | 'weekly' | 'custom';

/**
 * 调度配置
 */
export interface ScheduleConfig {
  enabled: boolean;           // 是否启用
  timezone?: string;          // 时区，如 'Asia/Shanghai'
  mode: ScheduleMode;         // 调度模式
  executionTimes?: string[];  // 执行时间点数组，如 ['08:00', '18:00']
  times?: string[];           // 执行时间点数组（兼容用法）
  time?: string;              // 单个执行时间（兼容用法）
  intervalDays?: number;      // 间隔天数（1-30），仅 interval 模式
  weekDays?: number[];        // 周执行日（1-7，1=周一），仅 weekly 模式
  weekdays?: number[];        // 周执行日（兼容用法）
  cron?: string;              // 自定义 cron 表达式，仅 custom 模式
}

/**
 * 系统设置
 */
export interface Settings {
  schedule: ScheduleConfig;
  content: {
    language: string;      // 语言，如 'zh-CN'
    minLength: number;     // 最小字数，默认 1500
    maxLength: number;     // 最大字数，默认 2500
  };
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 历史记录
 */
export interface History {
  articles: Article[];
  usage: {
    totalTokens: number;   // 累计 token
    totalCost: number;     // 累计成本（美元）
    lastReset: string;     // 上次重置时间
  };
  lastExecutionTime?: string; // 上次执行时间（ISO 格式）
}

/**
 * 主题配置文件
 */
export interface TopicsConfig {
  topics: Topic[];
}

// ============================================================================
// API 响应类型
// ============================================================================

/**
 * Perplexity API 配置
 */
export interface PerplexityConfig {
  apiKey: string;
  model?: string;        // 默认 'sonar'
  maxRetries?: number;   // 默认 3
}

/**
 * Perplexity API 响应
 */
export interface PerplexityResponse {
  content: string;
  citations: string[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 微信公众号配置
 */
export interface WeChatConfig {
  appId: string;
  appSecret: string;
}

/**
 * 微信文章
 */
export interface WeChatArticle {
  title: string;
  content: string;       // HTML 格式
  digest: string;
  thumbMediaId: string;
}

/**
 * GitHub API 配置
 */
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

/**
 * 认证配置
 */
export interface AuthConfig {
  password: string;
  jwtSecret: string;
  tokenExpiry?: number;  // 默认 24 小时
}

// ============================================================================
// 错误类型层次
// ============================================================================

/**
 * 基础错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Perplexity API 错误
 */
export class PerplexityApiError extends AppError {
  constructor(message: string, statusCode: number, retryable: boolean) {
    super(message, 'PERPLEXITY_ERROR', statusCode, retryable);
    this.name = 'PerplexityApiError';
    Object.setPrototypeOf(this, PerplexityApiError.prototype);
  }
}

/**
 * 微信 API 错误
 */
export class WeChatApiError extends AppError {
  constructor(message: string, public errcode: number) {
    const retryable = errcode === 40001; // access_token 过期可重试
    super(message, 'WECHAT_ERROR', 400, retryable);
    this.name = 'WeChatApiError';
    Object.setPrototypeOf(this, WeChatApiError.prototype);
  }
}

/**
 * GitHub API 错误
 */
export class GitHubApiError extends AppError {
  constructor(message: string, statusCode: number) {
    const retryable = statusCode >= 500;
    super(message, 'GITHUB_ERROR', statusCode, retryable);
    this.name = 'GitHubApiError';
    Object.setPrototypeOf(this, GitHubApiError.prototype);
  }
}

/**
 * 认证错误
 */
export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401, false);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
