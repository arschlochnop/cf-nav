import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { categories } from '../db/schema';
import { authMiddleware } from '../middleware/auth';

/**
 * 分类路由模块
 */
const categoriesRouter = new Hono<{ Bindings: { DB: D1Database } }>();

/**
 * 创建/更新分类验证 Schema
 */
const categorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符'),
  description: z.string().max(500, '描述最多 500 个字符').optional(),
  icon: z.string().max(500, '图标 URL 最多 500 个字符').optional(),
  sortOrder: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

/**
 * GET /categories - 获取分类列表（公开接口）
 */
categoriesRouter.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const showAll = c.req.query('showAll') === 'true'; // 管理员查看所有分类

    let query = db.select().from(categories);

    // 非管理员只显示可见分类
    if (!showAll) {
      query = query.where(eq(categories.isVisible, true));
    }

    const categoriesList = await query.orderBy(desc(categories.sortOrder));

    return c.json({
      success: true,
      data: categoriesList,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /categories/:id - 获取单个分类详情
 */
categoriesRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
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

    return c.json({
      success: true,
      data: category[0],
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /categories - 创建分类（需要认证）
 */
categoriesRouter.post('/', authMiddleware, zValidator('json', categorySchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const db = drizzle(c.env.DB);

    const result = await db.insert(categories).values({
      name: data.name,
      description: data.description,
      icon: data.icon,
      sortOrder: data.sortOrder ?? 0,
      isVisible: data.isVisible ?? true,
    });

    return c.json(
      {
        success: true,
        message: '分类创建成功',
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
 * PUT /categories/:id - 更新分类（需要认证）
 */
categoriesRouter.put('/:id', authMiddleware, zValidator('json', categorySchema), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const db = drizzle(c.env.DB);

    // 检查分类是否存在
    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          message: '分类不存在',
          code: 'CATEGORY_NOT_FOUND',
        },
        404
      );
    }

    // 更新分类
    await db
      .update(categories)
      .set({
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder ?? existing[0].sortOrder,
        isVisible: data.isVisible ?? existing[0].isVisible,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    return c.json({
      success: true,
      message: '分类更新成功',
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
 * DELETE /categories/:id - 删除分类（需要认证）
 * 注意：会级联删除该分类下的所有链接
 */
categoriesRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    // 检查分类是否存在
    const existing = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    if (existing.length === 0) {
      return c.json(
        {
          success: false,
          message: '分类不存在',
          code: 'CATEGORY_NOT_FOUND',
        },
        404
      );
    }

    // 删除分类（数据库会自动级联删除相关链接）
    await db.delete(categories).where(eq(categories.id, id));

    return c.json({
      success: true,
      message: '分类删除成功',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PATCH /categories/:id/visibility - 切换分类可见性（需要认证）
 */
categoriesRouter.patch('/:id/visibility', authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    // 查询当前状态
    const category = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

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

    // 切换可见性
    const newVisibility = !category[0].isVisible;
    await db
      .update(categories)
      .set({
        isVisible: newVisibility,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    return c.json({
      success: true,
      message: `分类已${newVisibility ? '显示' : '隐藏'}`,
      data: {
        id,
        isVisible: newVisibility,
      },
    });
  } catch (error) {
    throw error;
  }
});

export default categoriesRouter;
