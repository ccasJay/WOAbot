import { NextResponse } from 'next/server';

/**
 * 获取 GitHub Secrets 配置页面 URL
 * 
 * 根据环境变量中的 GITHUB_OWNER 和 GITHUB_REPO 构建链接
 */
export async function GET(): Promise<NextResponse> {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    return NextResponse.json(
      { 
        success: false, 
        error: '未配置 GITHUB_OWNER 或 GITHUB_REPO 环境变量',
        url: 'https://github.com/settings/tokens' // 回退到 GitHub 设置页
      },
      { status: 200 }
    );
  }

  const url = `https://github.com/${owner}/${repo}/settings/secrets/actions`;

  return NextResponse.json({ 
    success: true, 
    url,
    owner,
    repo
  });
}
