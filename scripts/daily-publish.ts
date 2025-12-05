/**
 * 每日发布脚本
 * 
 * 由 GitHub Actions 定时触发，执行以下流程：
 * 1. 检查是否为有效执行日
 * 2. 读取配置和主题
 * 3. 调用 Perplexity 生成内容
 * 4. 推送到微信草稿箱
 * 5. 更新历史记录
 * 
 * Requirements: 2.1, 3.1, 5.1, 6.1, 6.2, 6.3, 6.4, 7.5, 9.2
 */

import { v4 as uuidv4 } from 'uuid';

// 类型定义
type ScheduleMode = 'daily' | 'interval' | 'weekly';

interface Topic {
  id: string;
  name: string;
  keywords: string;
  enabled: boolean;
}

interface TopicsConfig {
  topics: Topic[];
}

interface ScheduleConfig {
  timezone: string;
  mode: ScheduleMode;
  executionTimes: string[];
  intervalDays?: number;
  weekDays?: number[];
}

interface Settings {
  schedule: ScheduleConfig;
  content: {
    language: string;
    minLength: number;
    maxLength: number;
  };
}

interface Article {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  digest: string;
  citations: string[];
  status: 'generated' | 'pushed' | 'failed';
  mediaId?: string;
  tokensUsed: number;
  createdAt: string;
  pushedAt?: string;
  error?: string;
}

interface History {
  articles: Article[];
  usage: {
    totalTokens: number;
    totalCost: number;
    lastReset: string;
  };
  lastExecutionTime?: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 环境变量
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = process.env.GITHUB_OWNER || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';

// 常量
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const WECHAT_API_BASE = 'https://api.weixin.qq.com';
const GITHUB_API_BASE = 'https://api.github.com';
const COST_PER_MILLION_TOKENS = 1.0;

/**
 * 日志输出
 */
function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({
    level,
    message,
    ...data,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * 从 GitHub 读取文件
 */
async function readGitHubFile<T>(path: string): Promise<T | null> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to read ${path}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return JSON.parse(content) as T;
}

/**
 * 写入 GitHub 文件
 */
async function writeGitHubFile<T>(path: string, content: T, message: string): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  
  let sha: string | undefined;
  const existingResponse = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (existingResponse.ok) {
    const existingData = await existingResponse.json();
    sha = existingData.sha;
  }

  const contentBase64 = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      ...(sha && { sha }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to write ${path}: ${response.statusText}`);
  }
}

/**
 * 检查是否为有效执行日
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
function isValidExecutionDay(
  date: Date,
  schedule: ScheduleConfig,
  lastExecutionTime?: string
): boolean {
  switch (schedule.mode) {
    case 'daily':
      return true;

    case 'interval':
      if (!lastExecutionTime) {
        return true;
      }
      const lastDate = new Date(lastExecutionTime);
      const daysDiff = Math.floor(
        (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff >= (schedule.intervalDays || 1);

    case 'weekly':
      const jsDay = date.getDay();
      const ourDay = jsDay === 0 ? 7 : jsDay;
      return (schedule.weekDays || []).includes(ourDay);

    default:
      return true;
  }
}


/**
 * 构建 Perplexity prompt
 */
function buildPrompt(topics: Topic[]): string {
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

请根据以上要求，搜索最新信息并生成文章。`;
}

/**
 * 调用 Perplexity API
 */
async function callPerplexity(prompt: string): Promise<{ content: string; citations: string[]; tokensUsed: number }> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.statusText}`);
  }

  const data: PerplexityResponse = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    citations: data.citations || [],
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

/**
 * Markdown 转 HTML
 */
function formatToHtml(markdown: string): string {
  let html = markdown;

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

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
    } else if (trimmed.startsWith('<h') || trimmed.startsWith('</')) {
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
 * 提取标题
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '每日资讯';
}

/**
 * 提取摘要
 */
function extractDigest(content: string): string {
  const withoutTitle = content.replace(/^#\s+.+$/m, '').trim();
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
  if (digest.length > 100) {
    digest = digest.substring(0, 97) + '...';
  }
  
  return digest;
}

/**
 * 获取微信 access_token
 */
async function getWeChatAccessToken(): Promise<string> {
  const url = `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.errcode) {
    throw new Error(`WeChat token error: ${data.errcode} - ${data.errmsg}`);
  }

  return data.access_token;
}

/**
 * 创建微信草稿
 */
async function createWeChatDraft(
  accessToken: string,
  article: { title: string; content: string; digest: string }
): Promise<string> {
  const url = `${WECHAT_API_BASE}/cgi-bin/draft/add?access_token=${accessToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articles: [{
        title: article.title,
        content: article.content,
        digest: article.digest,
        thumb_media_id: '',
        author: '',
        content_source_url: '',
        need_open_comment: 0,
        only_fans_can_comment: 0,
      }],
    }),
  });

  const data = await response.json();

  if (data.errcode) {
    throw new Error(`WeChat draft error: ${data.errcode} - ${data.errmsg}`);
  }

  return data.media_id;
}


/**
 * 主函数
 */
async function main(): Promise<void> {
  log('info', 'Starting daily publish task');

  try {
    // 1. 验证环境变量
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing PERPLEXITY_API_KEY');
    }
    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      throw new Error('Missing WeChat credentials');
    }
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      throw new Error('Missing GitHub configuration');
    }

    // 2. 读取配置
    log('info', 'Reading configuration');
    const settings = await readGitHubFile<Settings>('config/settings.json');
    const schedule = settings?.schedule || {
      timezone: 'Asia/Shanghai',
      mode: 'daily' as ScheduleMode,
      executionTimes: ['08:00'],
    };

    // 3. 读取历史记录
    let history = await readGitHubFile<History>('data/history.json');
    if (!history) {
      history = {
        articles: [],
        usage: {
          totalTokens: 0,
          totalCost: 0,
          lastReset: new Date().toISOString(),
        },
      };
    }

    // 4. 检查是否为有效执行日
    // Requirements: 6.1, 6.2, 6.3, 6.4
    const now = new Date();
    if (!isValidExecutionDay(now, schedule, history.lastExecutionTime)) {
      log('info', 'Not a valid execution day, skipping', {
        mode: schedule.mode,
        lastExecutionTime: history.lastExecutionTime,
        currentDate: now.toISOString(),
      });
      return;
    }

    // 5. 读取主题
    const topicsConfig = await readGitHubFile<TopicsConfig>('config/topics.json');
    const topics = topicsConfig?.topics || [];
    
    if (topics.filter(t => t.enabled).length === 0) {
      log('warn', 'No enabled topics found, skipping');
      return;
    }

    // 6. 生成内容
    log('info', 'Generating content with Perplexity');
    const prompt = buildPrompt(topics);
    const { content, citations, tokensUsed } = await callPerplexity(prompt);

    const title = extractTitle(content);
    const digest = extractDigest(content);
    const htmlContent = formatToHtml(content);

    log('info', 'Content generated', { title, tokensUsed });

    // 7. 创建文章记录
    const article: Article = {
      id: uuidv4(),
      title,
      content,
      htmlContent,
      digest,
      citations,
      status: 'generated',
      tokensUsed,
      createdAt: new Date().toISOString(),
    };

    // 8. 推送到微信
    log('info', 'Pushing to WeChat');
    try {
      const accessToken = await getWeChatAccessToken();
      const mediaId = await createWeChatDraft(accessToken, {
        title,
        content: htmlContent,
        digest,
      });

      article.status = 'pushed';
      article.mediaId = mediaId;
      article.pushedAt = new Date().toISOString();

      log('info', 'Successfully pushed to WeChat', { mediaId });
    } catch (wechatError) {
      article.status = 'failed';
      article.error = wechatError instanceof Error ? wechatError.message : String(wechatError);
      log('error', 'Failed to push to WeChat', { error: article.error });
    }

    // 9. 更新历史记录
    // Requirements: 6.4
    history.articles.unshift(article);
    history.usage.totalTokens += tokensUsed;
    history.usage.totalCost += (tokensUsed / 1_000_000) * COST_PER_MILLION_TOKENS;
    history.lastExecutionTime = new Date().toISOString();

    // 10. 保存历史记录
    log('info', 'Saving history');
    await writeGitHubFile('data/history.json', history, 'chore: update history');

    log('info', 'Daily publish task completed', {
      articleId: article.id,
      status: article.status,
      tokensUsed,
    });

  } catch (error) {
    log('error', 'Daily publish task failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// 执行主函数
main();
