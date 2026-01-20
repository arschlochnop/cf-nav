import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { links, categories } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { parseWebsiteMetadata } from '../services/parse';

/**
 * 链接路由模块
 */
const linksRouter = new Hono<{ Bindings: { DB: D1Database } }>();

/**
 * 创建/更新链接验证 Schema
 */
const linkSchema = z.object({
  categoryId: z.number().int().positive('分类 ID 必须为正整数'),
  title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 个字符'),
  url: z.string().url('URL 格式不正确'),
  description: z.string().max(500, '描述最多 500 个字符').optional(),
  icon: z.string().max(500, '图标 URL 最多 500 个字符').optional(),
  sortOrder: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

/**
 * URL 解析请求验证 Schema
 */
const parseUrlSchema = z.object({
  url: z.string().url('URL 格式不正确'),
});

/**
 * GET /links - 获取链接列表（公开接口）
 * 支持分类筛选和搜索
 */
linksRouter.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const categoryId = c.req.query('categoryId');
    const search = c.req.query('search');
    const showAll = c.req.query('showAll') === 'true';

    let query = db.select().from(links);

    // 分类筛选
    if (categoryId) {
      query = query.where(eq(links.categoryId, parseInt(categoryId)));
    }

    // 搜索功能（标题或描述）
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        sql`${links.title} LIKE ${searchTerm} OR ${links.description} LIKE ${searchTerm}`
      );
    }

    // 非管理员只显示可见链接
    if (!showAll) {
      query = query.where(eq(links.isVisible, true));
    }

    const linksList = await query.orderBy(desc(links.sortOrder), desc(links.createdAt));

    return c.json({
      success: true,
      data: linksList,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /links/:id - 获取单个链接详情
 */
linksRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    const link = await db.select().from(links).where(eq(links.id, id)).limit(1);

    if (link.length === 0) {
      return c.json(
        {
          success: false,
          message: '链接不存在',
          code: 'LINK_NOT_FOUND',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: link[0],
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /links - 创建链接（需要认证）
 */
linksRouter.post('/', authMiddleware, zValidator('json', linkSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const db = drizzle(c.env.DB);

    // 验证分类是否存在
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1);

    if (category.length === 0) {
      return c.json(
        {
          success: false,
          message: '分类不存在',
          code: 'CATEGORY_NOT_FOUND',
        },
        404
      );
    }

    // 创建链接
    const result = await db.insert(links).values({
      categoryId: data.categoryId,
      title: data.title,
      url: data.url,
      description: data.description,
      icon: data.icon,
      sortOrder: data.sortOrder ?? 0,
      isVisible: data.isVisible ?? true,
    });

    return c.json(
      {
        success: true,
        message: '链接创建成功',
        data: {
          id: result.lastInsertRowid,
          ...data,
        },
      },
      201
    );
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /links/:id - 更新链接（需要认证）
 */
linksRouter.put('/:id', authMiddleware, zValidator('json', linkSchema), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const db = drizzle(c.env.DB);

    // 检查链接是否存在
    const existing = await db.select().from(links).where(eq(links.id, id)).limit(1);

    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          message: '链接不存在',
          code: 'LINK_NOT_FOUND',
        },
        404
      );
    }

    // 验证分类是否存在
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1);

    if (category.length === 0) {
      return c.json(
        {
          success: false,
          message: '分类不存在',
          code: 'CATEGORY_NOT_FOUND',
        },
        404
      );
    }

    // 更新链接
    await db
      .update(links)
      .set({
        categoryId: data.categoryId,
        title: data.title,
        url: data.url,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder ?? existing[0].sortOrder,
        isVisible: data.isVisible ?? existing[0].isVisible,
        updatedAt: new Date(),
      })
      .where(eq(links.id, id));

    return c.json({
      success: true,
      message: '链接更新成功',
      data: {
        id,
        ...data,
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /links/:id - 删除链接（需要认证）
 */
linksRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    // 检查链接是否存在
    const existing = await db.select().from(links).where(eq(links.id, id)).limit(1);

    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          message: '链接不存在',
          code: 'LINK_NOT_FOUND',
        },
        404
      );
    }

    // 删除链接
    await db.delete(links).where(eq(links.id, id));

    return c.json({
      success: true,
      message: '链接删除成功',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PATCH /links/:id/visibility - 切换链接可见性（需要认证）
 */
linksRouter.patch('/:id/visibility', authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    // 查询当前状态
    const link = await db.select().from(links).where(eq(links.id, id)).limit(1);

    if (link.length === 0) {
      return c.json(
        {
          success: false,
          message: '链接不存在',
          code: 'LINK_NOT_FOUND',
        },
        404
      );
    }

    // 切换可见性
    const newVisibility = !link[0].isVisible;
    await db
      .update(links)
      .set({
        isVisible: newVisibility,
        updatedAt: new Date(),
      })
      .where(eq(links.id, id));

    return c.json({
      success: true,
      message: `链接已${newVisibility ? '显示' : '隐藏'}`,
      data: {
        id,
        isVisible: newVisibility,
      },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /links/:id/click - 记录链接点击（公开接口）
 */
linksRouter.post('/:id/click', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    // 增加点击计数
    await db
      .update(links)
      .set({
        clickCount: sql`${links.clickCount} + 1`,
      })
      .where(eq(links.id, id));

    return c.json({
      success: true,
      message: '点击记录成功',
    });
  } catch (error) {
    // 点击统计失败不影响用户体验，静默处理
    console.error('点击统计失败:', error);
    return c.json({
      success: true,
      message: '点击记录失败（已忽略）',
    });
  }
});

/**
 * POST /links/parse - 解析 URL 获取网站信息（需要认证）
 */
linksRouter.post('/parse', authMiddleware, zValidator('json', parseUrlSchema), async (c) => {
  try {
    const { url } = c.req.valid('json');

    // 调用解析服务
    const metadata = await parseWebsiteMetadata(url);

    return c.json({
      success: true,
      message: '解析成功',
      data: metadata,
    });
  } catch (error) {
    throw error;
  }
});

export default linksRouter;
