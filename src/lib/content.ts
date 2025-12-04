/**
 * 内容生成模块
 * 
 * 负责构建 prompt、调用 Perplexity API 生成内容、格式化输出
 */

import { Topic, PerplexityResponse } from '@/types';
import { PerplexityClient } from './perplexity';

/**
 * 生成的文章结构
 */
export interface GeneratedArticle {
  title: string;
  content: string;       // Markdown 格式
  htmlContent: string;   // HTML 格式（微信兼容）
  digest: string;
  citations: string[];
  tokensUsed: number;
}

/**
 * 将多个主题合并为单次 API 查询的 prompt
 * 
 * @param topics - 启用的主题列表
 * @returns 合并后的 prompt 字符串
 */
export function buildPrompt(topics: Topic[]): string {
  const enabledTopics = topics.filter(t => t.enabled);
  
  if (enabledTopics.length === 0) {
    throw new Error('没有启用的主题');
  }

  const topicList = enabledTopics
    .map((t, i) => `${i + 1}. ${t.name}（关键词：${t.keywords}）`)
    .join('\n');

  return `你是一位专业的内容编辑，请根据以下主题生成一篇类似 Perplexity 每日推送风格的中文文章。

## 主题列表
${topicList}

## 格式要求
1. 文章开头需要一个简短的引言段落（50-100字），概述今日要点
2. 正文分为 3-5 个编号章节，每个章节对应一个主题
3. 每个章节需要：
   - 清晰的标题
   - 详细的内容说明（200-400字）
   - 在章节末尾标注来源引用（使用 [来源] 格式）
4. 总字数控制在 1500-2500 个中文字符
5. 使用 Markdown 格式输出

## 输出格式示例
# [文章主标题]

[引言段落，50-100字]

## 1. [章节标题]

[章节内容，200-400字]

[来源](链接)

## 2. [章节标题]
...

请根据以上要求，搜索最新信息并生成文章。`;
}

/**
 * 将 Markdown 转换为微信兼容的 HTML
 * 
 * @param markdown - Markdown 格式内容
 * @returns HTML 格式内容
 */
export function formatToHtml(markdown: string): string {
  let html = markdown;

  // 转换标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 转换粗体和斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 转换链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 转换无序列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // 转换有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // 转换段落（连续的非空行）
  const lines = html.split('\n');
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === '') {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push('');
    } else if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('</')) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push(trimmed);
    } else {
      if (!inParagraph) {
        result.push('<p>' + trimmed);
        inParagraph = true;
      } else {
        result[result.length - 1] += ' ' + trimmed;
      }
    }
  }

  if (inParagraph) {
    result.push('</p>');
  }

  return result.join('\n').trim();
}

/**
 * 从生成的内容中提取标题
 */
export function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '每日资讯';
}

/**
 * 从生成的内容中提取摘要（引言段落）
 */
export function extractDigest(content: string): string {
  // 移除标题行
  const withoutTitle = content.replace(/^#\s+.+$/m, '').trim();
  
  // 获取第一个段落（到第一个空行或下一个标题）
  const lines = withoutTitle.split('\n');
  const digestLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      break;
    }
    digestLines.push(trimmed);
  }
  
  let digest = digestLines.join(' ').trim();
  
  // 限制在 100 字以内
  if (digest.length > 100) {
    digest = digest.substring(0, 97) + '...';
  }
  
  return digest;
}

/**
 * 生成每日摘要文章
 * 
 * @param topics - 主题列表
 * @param client - Perplexity 客户端
 * @returns 生成的文章
 */
export async function generateDailySummary(
  topics: Topic[],
  client: PerplexityClient
): Promise<GeneratedArticle> {
  const prompt = buildPrompt(topics);
  const response: PerplexityResponse = await client.search(prompt);

  const content = response.content;
  const title = extractTitle(content);
  const digest = extractDigest(content);
  const htmlContent = formatToHtml(content);

  return {
    title,
    content,
    htmlContent,
    digest,
    citations: response.citations,
    tokensUsed: response.usage.totalTokens,
  };
}

/**
 * 统计中文字符数
 */
export function countChineseCharacters(text: string): number {
  // 匹配中文字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  return chineseChars ? chineseChars.length : 0;
}

/**
 * 验证内容格式是否符合要求
 */
export function validateContentFormat(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查是否有主标题
  if (!content.match(/^#\s+.+$/m)) {
    errors.push('缺少主标题');
  }

  // 检查章节数量（## 开头的标题）
  const sections = content.match(/^##\s+.+$/gm) || [];
  if (sections.length < 3) {
    errors.push(`章节数量不足：期望 3-5 个，实际 ${sections.length} 个`);
  } else if (sections.length > 5) {
    errors.push(`章节数量过多：期望 3-5 个，实际 ${sections.length} 个`);
  }

  // 检查字符数
  const charCount = countChineseCharacters(content);
  if (charCount < 1500) {
    errors.push(`字符数不足：期望 1500-2500，实际 ${charCount}`);
  } else if (charCount > 2500) {
    errors.push(`字符数过多：期望 1500-2500，实际 ${charCount}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// 用量统计功能
// ============================================================================

/**
 * 预算常量
 */
const MONTHLY_BUDGET_USD = 5.0;  // 每月预算 $5
const BUDGET_WARNING_THRESHOLD = 0.8;  // 80% 警告阈值
const DAYS_IN_CYCLE = 30;  // 30 天周期

/**
 * Perplexity API 定价（每百万 token）
 * sonar 模型: $1/M input, $1/M output (简化为平均 $1/M)
 */
const COST_PER_MILLION_TOKENS = 1.0;

/**
 * 用量统计数据
 */
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  lastReset: string;
}

/**
 * 计算 token 成本（美元）
 * 
 * @param tokens - token 数量
 * @returns 成本（美元）
 */
export function calculateTokenCost(tokens: number): number {
  return (tokens / 1_000_000) * COST_PER_MILLION_TOKENS;
}

/**
 * 累加 token 用量
 * 
 * @param currentUsage - 当前用量统计
 * @param newTokens - 新增 token 数量
 * @returns 更新后的用量统计
 */
export function accumulateUsage(currentUsage: UsageStats, newTokens: number): UsageStats {
  const newCost = calculateTokenCost(newTokens);
  return {
    totalTokens: currentUsage.totalTokens + newTokens,
    totalCost: currentUsage.totalCost + newCost,
    lastReset: currentUsage.lastReset,
  };
}

/**
 * 计算预估剩余天数
 * 
 * @param usage - 当前用量统计
 * @returns 预估剩余天数
 */
export function calculateRemainingDays(usage: UsageStats): number {
  if (usage.totalCost <= 0) {
    return DAYS_IN_CYCLE;
  }

  // 计算已使用天数
  const lastReset = new Date(usage.lastReset);
  const now = new Date();
  const daysSinceReset = Math.max(1, Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)));

  // 计算日均成本
  const dailyCost = usage.totalCost / daysSinceReset;

  if (dailyCost <= 0) {
    return DAYS_IN_CYCLE;
  }

  // 计算剩余预算可支持的天数
  const remainingBudget = MONTHLY_BUDGET_USD - usage.totalCost;
  const remainingDays = Math.floor(remainingBudget / dailyCost);

  return Math.max(0, remainingDays);
}

/**
 * 判断是否应该显示预算警告
 * 
 * @param usage - 当前用量统计
 * @returns 是否显示警告
 */
export function shouldShowWarning(usage: UsageStats): boolean {
  const warningThreshold = MONTHLY_BUDGET_USD * BUDGET_WARNING_THRESHOLD;
  return usage.totalCost >= warningThreshold;
}

/**
 * 获取预算使用百分比
 * 
 * @param usage - 当前用量统计
 * @returns 使用百分比（0-100）
 */
export function getBudgetUsagePercentage(usage: UsageStats): number {
  return Math.min(100, (usage.totalCost / MONTHLY_BUDGET_USD) * 100);
}

/**
 * 重置用量统计
 * 
 * @returns 重置后的用量统计
 */
export function resetUsage(): UsageStats {
  return {
    totalTokens: 0,
    totalCost: 0,
    lastReset: new Date().toISOString(),
  };
}

/**
 * 创建默认用量统计
 * 
 * @returns 默认用量统计
 */
export function createDefaultUsage(): UsageStats {
  return resetUsage();
}


// ============================================================================
// 文章状态管理
// Requirements: 5.4, 5.5
// ============================================================================

import { Article } from '@/types';

/**
 * 文章状态类型
 */
export type ArticleStatus = 'generated' | 'pushed' | 'failed';

/**
 * 状态转换结果
 */
export interface StatusTransitionResult {
  success: boolean;
  article: Article;
  error?: string;
}

/**
 * 创建新文章记录
 * 初始状态为 'generated'
 * 
 * @param data - 文章数据
 * @returns 新文章对象
 */
export function createArticle(data: {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  digest: string;
  citations: string[];
  tokensUsed: number;
}): Article {
  return {
    ...data,
    status: 'generated',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 将文章状态更新为 'pushed'（推送成功）
 * Requirements: 5.4
 * 
 * @param article - 原文章
 * @param mediaId - 微信草稿 media_id
 * @returns 更新后的文章
 */
export function markArticleAsPushed(article: Article, mediaId: string): Article {
  if (article.status !== 'generated') {
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'Attempting to mark non-generated article as pushed',
      articleId: article.id,
      currentStatus: article.status,
      timestamp: new Date().toISOString(),
    }));
  }

  return {
    ...article,
    status: 'pushed',
    mediaId,
    pushedAt: new Date().toISOString(),
    error: undefined, // 清除之前的错误
  };
}

/**
 * 将文章状态更新为 'failed'（推送失败）
 * Requirements: 5.5
 * 
 * @param article - 原文章
 * @param error - 错误信息
 * @returns 更新后的文章
 */
export function markArticleAsFailed(article: Article, error: string): Article {
  return {
    ...article,
    status: 'failed',
    error,
    mediaId: undefined, // 清除之前的 mediaId
  };
}

/**
 * 更新文章状态
 * 统一的状态转换函数
 * 
 * @param article - 原文章
 * @param status - 目标状态
 * @param options - 额外选项（mediaId 或 error）
 * @returns 状态转换结果
 */
export function updateArticleStatus(
  article: Article,
  status: ArticleStatus,
  options?: { mediaId?: string; error?: string }
): StatusTransitionResult {
  try {
    let updatedArticle: Article;

    switch (status) {
      case 'pushed':
        if (!options?.mediaId) {
          return {
            success: false,
            article,
            error: '推送成功状态需要提供 mediaId',
          };
        }
        updatedArticle = markArticleAsPushed(article, options.mediaId);
        break;

      case 'failed':
        if (!options?.error) {
          return {
            success: false,
            article,
            error: '失败状态需要提供错误信息',
          };
        }
        updatedArticle = markArticleAsFailed(article, options.error);
        break;

      case 'generated':
        // 重置为初始状态（用于重试）
        updatedArticle = {
          ...article,
          status: 'generated',
          mediaId: undefined,
          pushedAt: undefined,
          error: undefined,
        };
        break;

      default:
        return {
          success: false,
          article,
          error: `未知状态: ${status}`,
        };
    }

    return {
      success: true,
      article: updatedArticle,
    };
  } catch (err) {
    return {
      success: false,
      article,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 验证文章状态转换是否有效
 * 
 * @param currentStatus - 当前状态
 * @param targetStatus - 目标状态
 * @returns 是否有效
 */
export function isValidStatusTransition(
  currentStatus: ArticleStatus,
  targetStatus: ArticleStatus
): boolean {
  // 允许的状态转换
  const validTransitions: Record<ArticleStatus, ArticleStatus[]> = {
    generated: ['pushed', 'failed'],
    pushed: ['generated'], // 允许重置以便重新推送
    failed: ['generated', 'pushed'], // 允许重试
  };

  return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
}
