/**
 * GitHub API 客户端单元测试
 */

import { describe, it, expect } from 'vitest';
import { getDefaultTopicsConfig, getDefaultSettings, getDefaultHistory } from '@/lib/github';

describe('GitHub Client - Default Configurations', () => {
  it('should return default topics config', () => {
    const config = getDefaultTopicsConfig();
    expect(config).toHaveProperty('topics');
    expect(Array.isArray(config.topics)).toBe(true);
    expect(config.topics.length).toBe(0);
  });

  it('should return default settings', () => {
    const settings = getDefaultSettings();
    expect(settings).toHaveProperty('schedule');
    expect(settings).toHaveProperty('content');
    expect(settings.schedule.timezone).toBe('Asia/Shanghai');
    expect(settings.schedule.preferredTime).toBe('08:00');
    expect(settings.content.language).toBe('zh-CN');
    expect(settings.content.minLength).toBe(1500);
    expect(settings.content.maxLength).toBe(2500);
  });

  it('should return default history', () => {
    const history = getDefaultHistory();
    expect(history).toHaveProperty('articles');
    expect(history).toHaveProperty('usage');
    expect(Array.isArray(history.articles)).toBe(true);
    expect(history.articles.length).toBe(0);
    expect(history.usage.totalTokens).toBe(0);
    expect(history.usage.totalCost).toBe(0);
    expect(history.usage.lastReset).toBeDefined();
  });
});
