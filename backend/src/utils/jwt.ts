import jwt from 'jsonwebtoken';

/**
 * JWT 配置常量
 * 注意：JWT_SECRET 必须在环境变量中配置，否则程序将无法启动
 *
 * 设计说明：
 * - 在 Cloudflare Workers 环境下，环境变量通过 env 对象传递，而非 process.env
 * - 在测试环境下，环境变量通过 Vitest 配置的 miniflare.bindings 传递
 * - 为了兼容两种环境，这里使用依赖注入模式：调用方传入 secret
 */
const JWT_EXPIRES_IN = '7d'; // Token 有效期 7 天

/**
 * JWT Payload 接口定义
 */
export interface JWTPayload {
  userId: number;
  username: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}

/**
 * 生成 JWT Token
 * @param userId 用户 ID（支持 number 或 bigint，会自动转换为 number）
 * @param username 用户名
 * @param secret JWT 密钥（来自环境变量）
 * @returns JWT Token 字符串
 */
export function generateToken(userId: number | bigint, username: string, secret: string): string {
  if (!secret) {
    throw new Error('JWT_SECRET 未设置！请在环境变量中配置');
  }

  try {
    // 重要：D1 的 lastInsertRowid 返回 bigint，需要转换为 number
    // JSON.stringify（jwt.sign 内部使用）不支持 bigint 类型
    const userIdNumber = typeof userId === 'bigint' ? Number(userId) : userId;

    const payload: JWTPayload = {
      userId: userIdNumber,
      username,
    };

    return jwt.sign(payload, secret, {
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    throw new Error(`生成 Token 失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证并解析 JWT Token
 * @param token JWT Token 字符串
 * @param secret JWT 密钥（来自环境变量）
 * @returns 解析后的 Payload
 * @throws 验证失败时抛出错误
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  if (!secret) {
    throw new Error('JWT_SECRET 未设置！请在环境变量中配置');
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token 已过期');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token 无效');
    }
    throw new Error(`验证 Token 失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从 Authorization Header 中提取 Token
 * @param authHeader Authorization Header 值
 * @returns 提取的 Token，如果格式不正确返回 null
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer <token>" 格式
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  // 直接返回整个字符串（兼容直接传 Token 的情况）
  return authHeader;
}
