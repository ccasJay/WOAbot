/**
 * GitHub API 客户端
 * 
 * 用于读写 GitHub 仓库中的配置和历史文件
 * Requirements: 9.1, 9.4
 */

import { GitHubConfig, GitHubApiError, TopicsConfig, Settings, History } from '@/types';

/**
 * GitHub API 客户端类
 */
export class GitHubClient {
  private config: GitHubConfig;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  /**
   * 获取文件内容
   * 如果文件不存在，返回 null
   * Requirements: 9.1, 9.4
   */
  async getFile<T>(path: string): Promise<T | null> {
    try {
      const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.status === 404) {
        // 文件不存在，返回 null
        return null;
      }

      if (!response.ok) {
        throw new GitHubApiError(
          `Failed to get file: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      
      // GitHub API 返回 base64 编码的内容
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      if (error instanceof GitHubApiError) {
        throw error;
      }
      throw new GitHubApiError(
        `Error reading file from GitHub: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }

  /**
   * 更新文件内容
   * 如果文件不存在，会创建新文件
   * Requirements: 9.1, 9.2
   */
  async updateFile<T>(path: string, content: T, message: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
      
      // 首先获取文件的 SHA（如果存在）
      let sha: string | undefined;
      try {
        const existingResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          sha = existingData.sha;
        }
      } catch {
        // 文件不存在，继续创建
      }

      // 将内容转换为 base64
      const contentString = JSON.stringify(content, null, 2);
      const contentBase64 = Buffer.from(contentString).toString('base64');

      // 更新或创建文件
      const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: contentBase64,
          ...(sha && { sha }),
        }),
      });

      if (!updateResponse.ok) {
        throw new GitHubApiError(
          `Failed to update file: ${updateResponse.statusText}`,
          updateResponse.status
        );
      }
    } catch (error) {
      if (error instanceof GitHubApiError) {
        throw error;
      }
      throw new GitHubApiError(
        `Error updating file on GitHub: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }

  /**
   * 触发 GitHub Actions workflow
   * Requirements: 2.3
   */
  async triggerWorkflow(workflowId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/actions/workflows/${workflowId}/dispatches`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main', // 或者从配置中读取默认分支
        }),
      });

      if (!response.ok) {
        throw new GitHubApiError(
          `Failed to trigger workflow: ${response.statusText}`,
          response.status
        );
      }
    } catch (error) {
      if (error instanceof GitHubApiError) {
        throw error;
      }
      throw new GitHubApiError(
        `Error triggering workflow: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }
}

/**
 * 创建 GitHub 客户端实例
 */
export function createGitHubClient(): GitHubClient {
  const config: GitHubConfig = {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
  };

  if (!config.token || !config.owner || !config.repo) {
    throw new Error('Missing required GitHub configuration');
  }

  return new GitHubClient(config);
}

/**
 * 获取默认配置
 * Requirements: 9.4
 */
export function getDefaultTopicsConfig(): TopicsConfig {
  return {
    topics: [],
  };
}

export function getDefaultSettings(): Settings {
  return {
    schedule: {
      timezone: 'Asia/Shanghai',
      preferredTime: '08:00',
    },
    content: {
      language: 'zh-CN',
      minLength: 1500,
      maxLength: 2500,
    },
  };
}

export function getDefaultHistory(): History {
  return {
    articles: [],
    usage: {
      totalTokens: 0,
      totalCost: 0,
      lastReset: new Date().toISOString(),
    },
  };
}

/**
 * 获取主题配置
 * 如果文件不存在，返回默认配置
 */
export async function getTopics(): Promise<TopicsConfig> {
  try {
    const client = createGitHubClient();
    const topics = await client.getFile<TopicsConfig>('config/topics.json');
    return topics ?? getDefaultTopicsConfig();
  } catch {
    return getDefaultTopicsConfig();
  }
}

/**
 * 获取设置
 * 如果文件不存在，返回默认设置
 */
export async function getSettings(): Promise<Settings> {
  try {
    const client = createGitHubClient();
    const settings = await client.getFile<Settings>('config/settings.json');
    return settings ?? getDefaultSettings();
  } catch {
    return getDefaultSettings();
  }
}

/**
 * 获取历史记录
 * 如果文件不存在，返回默认历史
 */
export async function getHistory(): Promise<History> {
  try {
    const client = createGitHubClient();
    const history = await client.getFile<History>('data/history.json');
    return history ?? getDefaultHistory();
  } catch {
    return getDefaultHistory();
  }
}

/**
 * 更新历史记录
 */
export async function updateHistory(history: History): Promise<void> {
  const client = createGitHubClient();
  await client.updateFile('data/history.json', history, 'chore: update history');
}
