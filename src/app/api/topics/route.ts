/**
 * 主题管理 API - GET 和 POST
 * Requirements: 1.2, 1.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient, getDefaultTopicsConfig } from '@/lib/github';
import { Topic, TopicsConfig } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TOPICS_FILE_PATH = 'config/topics.json';

/**
 * GET /api/topics - 获取所有主题
 * Requirements: 1.5
 */
export async function GET() {
  try {
    const github = createGitHubClient();
    
    // 从 GitHub 读取主题配置
    let config = await github.getFile<TopicsConfig>(TOPICS_FILE_PATH);
    
    // 如果文件不存在，返回默认配置
    if (!config) {
      config = getDefaultTopicsConfig();
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/topics - 添加新主题
 * Requirements: 1.2
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, keywords, enabled = true } = body;

    // 验证必需字段
    if (!name || !keywords) {
      return NextResponse.json(
        { error: 'Name and keywords are required' },
        { status: 400 }
      );
    }

    const github = createGitHubClient();
    
    // 读取现有配置
    let config = await github.getFile<TopicsConfig>(TOPICS_FILE_PATH);
    if (!config) {
      config = getDefaultTopicsConfig();
    }

    // 创建新主题
    const newTopic: Topic = {
      id: uuidv4(),
      name,
      keywords,
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 添加到配置
    config.topics.push(newTopic);

    // 保存到 GitHub
    await github.updateFile(
      TOPICS_FILE_PATH,
      config,
      `chore: add topic "${name}"`
    );

    return NextResponse.json(newTopic, { status: 201 });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
