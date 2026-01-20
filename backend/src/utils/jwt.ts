import jwt from 'jsonwebtoken';

/**
 * JWT 配置常量
 * 注意：JWT_SECRET 必须在环境变量中配置，否则程序将无法启动
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('环境变量 JWT_SECRET 未设置！请在 .env 文件或 wrangler.toml 中配置');
  }
  return secret;
}

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
 * @param userId 用户 ID
 * @param username 用户名
 * @returns JWT Token 字符串
 */
export function generateToken(userId: number, username: string): string {
  try {
    const payload: JWTPayload = {
      userId,
      username,
    };

    return jwt.sign(payload, getJwtSecret(), {
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    throw new Error(`生成 Token 失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证并解析 JWT Token
 * @param token JWT Token 字符串
 * @returns 解析后的 Payload
 * @throws 验证失败时抛出错误
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
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
