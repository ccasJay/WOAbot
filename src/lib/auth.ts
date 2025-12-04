/**
 * JWT 认证服务
 * 
 * 提供密码验证、JWT token 生成和验证功能
 */

import { SignJWT, jwtVerify } from 'jose';
import { AuthConfig, AuthError } from '@/types';

/**
 * 认证服务类
 */
export class AuthService {
  private password: string;
  private jwtSecret: Uint8Array;
  private tokenExpiry: number;

  constructor(config: AuthConfig) {
    this.password = config.password;
    this.jwtSecret = new TextEncoder().encode(config.jwtSecret);
    this.tokenExpiry = config.tokenExpiry || 24 * 60 * 60; // 默认 24 小时（秒）
  }

  /**
   * 验证密码
   * @param input 用户输入的密码
   * @returns 密码是否正确
   */
  verifyPassword(input: string): boolean {
    return input === this.password;
  }

  /**
   * 生成 JWT token
   * @returns JWT token 字符串
   */
  async generateToken(): Promise<string> {
    try {
      const token = await new SignJWT({ authenticated: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${this.tokenExpiry}s`)
        .sign(this.jwtSecret);

      return token;
    } catch {
      throw new AuthError('Failed to generate token');
    }
  }

  /**
   * 验证 JWT token
   * @param token JWT token 字符串
   * @returns token 是否有效
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      await jwtVerify(token, this.jwtSecret);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 创建认证服务实例
 * @param config 认证配置
 * @returns 认证服务实例
 */
export function createAuthService(config: AuthConfig): AuthService {
  return new AuthService(config);
}
