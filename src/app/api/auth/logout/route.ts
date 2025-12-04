/**
 * 登出 API 路由
 * 
 * 处理用户登出请求，清除 JWT cookie
 */

import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  try {
    // 创建响应并清除 cookie
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
