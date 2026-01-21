import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

/**
 * 环境变量类型定义
 */
type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

/**
 * Context Variables 类型定义（用于中间件传递数据）
 */
type Variables = {
  user: {
    userId: number;
    username: string;
  };
};

/**
 * 认证路由模块
 */
const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * 登录请求验证 Schema
 */
const loginSchema = z.object({
  username: z.string().min(3, '用户名至少 3 个字符').max(50, '用户名最多 50 个字符'),
  password: z.string().min(1, '密码不能为空'),
});

/**
 * 注册请求验证 Schema
 */
const registerSchema = z.object({
  username: z.string().min(3, '用户名至少 3 个字符').max(50, '用户名最多 50 个字符'),
  password: z.string().min(8, '密码至少 8 个字符'),
  email: z.string().email('邮箱格式不正确'),
});

/**
 * 修改密码请求验证 Schema
 */
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(8, '新密码至少 8 个字符'),
});

/**
 * POST /auth/login - 用户登录
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { username, password } = c.req.valid('json');
    const db = drizzle(c.env.DB);

    // 查询用户
    const userList = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (userList.length === 0) {
      return c.json(
        {
          success: false,
          message: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS',
        },
        401
      );
    }

    const user = userList[0];

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return c.json(
        {
          success: false,
          message: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS',
        },
        401
      );
    }

    // 生成 JWT Token（从环境变量获取密钥）
    const token = generateToken(user.id, user.username, c.env.JWT_SECRET);

    return c.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /auth/register - 用户注册
 * 注意：生产环境应该限制注册或添加邀请码机制
 */
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { username, password, email } = c.req.valid('json');
    const db = drizzle(c.env.DB);

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return c.json(
        {
          success: false,
          message: '密码强度不足',
          code: 'WEAK_PASSWORD',
          errors: passwordValidation.errors,
        },
        400
      );
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUserByUsername.length > 0) {
      return c.json(
        {
          success: false,
          message: '用户名已存在',
          code: 'USERNAME_EXISTS',
        },
        409
      );
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      return c.json(
        {
          success: false,
          message: '邮箱已被使用',
          code: 'EMAIL_EXISTS',
        },
        409
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户（使用 .returning() 获取插入的 ID）
    const result = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
      })
      .returning({ id: users.id, username: users.username, email: users.email });

    const newUser = result[0];

    // 生成 Token（从环境变量获取密钥）
    const token = generateToken(newUser.id, username, c.env.JWT_SECRET);

    return c.json(
      {
        success: true,
        message: '注册成功',
        data: {
          token,
          user: newUser,
        },
      },
      201
    );
  } catch (error) {
    throw error;
  }
});

/**
 * GET /auth/me - 获取当前登录用户信息
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const db = drizzle(c.env.DB);

    // 查询用户完整信息
    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (userList.length === 0) {
      return c.json(
        {
          success: false,
          message: '用户不存在',
          code: 'USER_NOT_FOUND',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: userList[0],
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /auth/password - 修改密码
 * 需要认证（JWT Token）
 */
auth.put('/password', authMiddleware, zValidator('json', changePasswordSchema), async (c) => {
  try {
    const user = c.get('user');
    const { oldPassword, newPassword } = c.req.valid('json');
    const db = drizzle(c.env.DB);

    // 查询当前用户信息（包括密码哈希）
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (userList.length === 0) {
      return c.json(
        {
          success: false,
          message: '用户不存在',
          code: 'USER_NOT_FOUND',
        },
        404
      );
    }

    const currentUser = userList[0];

    // 验证旧密码是否正确
    const isOldPasswordValid = await verifyPassword(oldPassword, currentUser.password);

    if (!isOldPasswordValid) {
      return c.json(
        {
          success: false,
          message: '旧密码错误',
          code: 'INVALID_OLD_PASSWORD',
        },
        401
      );
    }

    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return c.json(
        {
          success: false,
          message: '新密码强度不足',
          code: 'WEAK_PASSWORD',
          errors: passwordValidation.errors,
        },
        400
      );
    }

    // 检查新密码是否与旧密码相同
    if (oldPassword === newPassword) {
      return c.json(
        {
          success: false,
          message: '新密码不能与旧密码相同',
          code: 'SAME_PASSWORD',
        },
        400
      );
    }

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新数据库中的密码
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(), // Drizzle timestamp 字段需要 Date 对象而非字符串
      })
      .where(eq(users.id, user.userId));

    return c.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    throw error;
  }
});

export default auth;
