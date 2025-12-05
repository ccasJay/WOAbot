/**
 * 主题管理 API - PUT 和 DELETE
 * Requirements: 1.3, 1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient, getDefaultTopicsConfig } from '@/lib/github';
import { TopicsConfig } from '@/types';

const TOPICS_FILE_PATH = 'config/topics.json';

/**
 * PUT /api/topics/[id] - 更新主题
 * Requirements: 1.3
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, keywords, enabled } = body;

    const github = createGitHubClient();
    
    // 读取现有配置
    let config = await github.getFile<TopicsConfig>(TOPICS_FILE_PATH);
    if (!config) {
      config = getDefaultTopicsConfig();
    }

    // 查找主题
    const topicIndex = config.topics.findIndex(t => t.id === id);
    if (topicIndex === -1) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // 更新主题
    const updatedTopic = {
      ...config.topics[topicIndex],
      ...(name !== undefined && { name }),
      ...(keywords !== undefined && { keywords }),
      ...(enabled !== undefined && { enabled }),
      updatedAt: new Date().toISOString(),
    };

    config.topics[topicIndex] = updatedTopic;

    // 保存到 GitHub
    await github.updateFile(
      TOPICS_FILE_PATH,
      config,
      `chore: update topic "${updatedTopic.name}"`
    );

    return NextResponse.json(updatedTopic);
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/topics/[id] - 删除主题
 * Requirements: 1.4
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const github = createGitHubClient();
    
    // 读取现有配置
    let config = await github.getFile<TopicsConfig>(TOPICS_FILE_PATH);
    if (!config) {
      config = getDefaultTopicsConfig();
    }

    // 查找主题
    const topicIndex = config.topics.findIndex(t => t.id === id);
    if (topicIndex === -1) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    const deletedTopic = config.topics[topicIndex];

    // 删除主题
    config.topics.splice(topicIndex, 1);

    // 保存到 GitHub
    await github.updateFile(
      TOPICS_FILE_PATH,
      config,
      `chore: delete topic "${deletedTopic.name}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json(
      { error: 'Failed to delete topic' },
      { status: 500 }
    );
  }
}
