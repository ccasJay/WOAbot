/**
 * 登录 API 路由
 * 
 * 处理用户登录请求，验证密码并设置 JWT cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth';
import { AuthError } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // 从环境变量获取配置
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPassword || !jwtSecret) {
      console.error('Missing environment variables: ADMIN_PASSWORD or JWT_SECRET');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 创建认证服务
    const authService = createAuthService({
      password: adminPassword,
      jwtSecret,
      tokenExpiry: 24 * 60 * 60, // 24 小时
    });

    // 验证密码
    if (!authService.verifyPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // 生成 token
    const token = await authService.generateToken();

    // 创建响应并设置 httpOnly cookie
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 小时
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
