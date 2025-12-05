import { NextResponse } from 'next/server';

/**
 * 获取 Vercel 环境变量配置页面 URL
 * 
 * 由于 Vercel 项目名可能与 GitHub 仓库名不同，
 * 这里提供通用的 Vercel 环境变量设置入口
 */
export async function GET(): Promise<NextResponse> {
  // Vercel 项目环境变量页面
  // 用户需要在 Vercel Dashboard 中找到对应项目
  const url = 'https://vercel.com/dashboard';

  return NextResponse.json({ 
    success: true, 
    url,
    note: '请在 Vercel Dashboard 中选择对应项目，然后进入 Settings → Environment Variables'
  });
}
