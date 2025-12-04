/**
 * Next.js 中间件
 * 
 * 保护需要认证的路由，未认证用户重定向到登录页
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 如果访问的是 dashboard 路由，检查认证
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')?.value;

    // 没有 token，重定向到登录页
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 验证 token
    try {
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('JWT_SECRET not configured');
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      const secret = new TextEncoder().encode(jwtSecret);
      await jwtVerify(token, secret);

      // Token 有效，继续请求
      return NextResponse.next();
    } catch (error) {
      // Token 无效或过期，重定向到登录页
      console.error('Token verification failed:', error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 其他路由直接放行
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (登录页)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
