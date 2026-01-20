/**
 * 分类路由集成测试
 *
 * 测试范围:
 * - GET /categories: 获取分类列表
 * - GET /categories/:id: 获取单个分类详情
 * - POST /categories: 创建分类（需认证）
 * - PUT /categories/:id: 更新分类（需认证）
 * - DELETE /categories/:id: 删除分类（需认证）
 * - PATCH /categories/:id/visibility: 切换分类可见性（需认证）
 *
 * 测试策略:
 * - 正常场景: 验证 CRUD 操作的完整流程
 * - 边界条件: 测试参数验证、权限控制等边界值
 * - 异常场景: 测试不存在的资源、未授权访问等异常情况
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { categories, users } from '../../src/db/schema';
import { hashPassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';

describe('分类路由集成测试', () => {
  let db: ReturnType<typeof drizzle>;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    // 初始化数据库连接
    db = drizzle(env.DB);

    // 创建测试用户并生成 Token
    const userResult = await db.insert(users).values({
      username: 'testadmin',
      password: await hashPassword('Test1234'),
      email: 'admin@example.com',
    });

    userId = userResult.lastInsertRowid as number;
    authToken = await generateToken(userId, 'testadmin', 'test-jwt-secret-key-for-vitest');
  });

  beforeEach(async () => {
    // 每个测试前清空分类表
    await db.delete(categories);
  });

  afterAll(async () => {
    // 测试完成后清理
    await db.delete(categories);
    await db.delete(users);
  });

  /**
   * GET /categories 测试
   */
  describe('GET /categories', () => {
    it('应返回所有可见的分类列表', async () => {
      // 创建测试数据
      await db.insert(categories).values([
        { name: '开发工具', description: '编程相关工具', sortOrder: 10, isVisible: true },
        { name: '设计资源', description: '设计相关资源', sortOrder: 5, isVisible: true },
        { name: '隐藏分类', description: '不可见', sortOrder: 1, isVisible: false },
      ]);

      const response = await SELF.fetch('http://localhost/api/categories');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2); // 只返回可见的
      expect(data.data[0].name).toBe('开发工具'); // 按 sortOrder 降序
      expect(data.data[1].name).toBe('设计资源');
    });

    it('应在 showAll=true 时返回所有分类（包括隐藏）', async () => {
      await db.insert(categories).values([
        { name: '可见1', sortOrder: 2, isVisible: true },
        { name: '隐藏1', sortOrder: 1, isVisible: false },
      ]);

      const response = await SELF.fetch('http://localhost/api/categories?showAll=true');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2); // 返回所有
    });

    it('应按 sortOrder 降序排序', async () => {
      await db.insert(categories).values([
        { name: 'C', sortOrder: 5, isVisible: true },
        { name: 'A', sortOrder: 10, isVisible: true },
        { name: 'B', sortOrder: 7, isVisible: true },
      ]);

      const response = await SELF.fetch('http://localhost/api/categories');

      const data = await response.json();
      expect(data.data[0].name).toBe('A'); // sortOrder: 10
      expect(data.data[1].name).toBe('B'); // sortOrder: 7
      expect(data.data[2].name).toBe('C'); // sortOrder: 5
    });

    it('应返回空数组当没有分类时', async () => {
      const response = await SELF.fetch('http://localhost/api/categories');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  /**
   * GET /categories/:id 测试
   */
  describe('GET /categories/:id', () => {
    it('应返回指定 ID 的分类详情', async () => {
      const result = await db.insert(categories).values({
        name: '测试分类',
        description: '测试描述',
        icon: '🔧',
        sortOrder: 5,
        isVisible: true,
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: '测试分类',
        description: '测试描述',
        icon: '🔧',
        sortOrder: 5,
        isVisible: true,
      });
    });

    it('应返回 404 当分类不存在时', async () => {
      const response = await SELF.fetch('http://localhost/api/categories/999999');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('分类不存在');
      expect(data.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('应返回隐藏的分类（此接口不过滤可见性）', async () => {
      const result = await db.insert(categories).values({
        name: '隐藏分类',
        isVisible: false,
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.name).toBe('隐藏分类');
      expect(data.data.isVisible).toBe(false);
    });
  });

  /**
   * POST /categories 测试（需认证）
   */
  describe('POST /categories', () => {
    it('应成功创建新分类', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '新分类',
          description: '这是新分类的描述',
          icon: '📚',
          sortOrder: 10,
          isVisible: true,
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('分类创建成功');
      expect(data.data).toMatchObject({
        name: '新分类',
        description: '这是新分类的描述',
        icon: '📚',
        sortOrder: 10,
        isVisible: true,
      });
      expect(data.data.id).toBeDefined();

      // 验证数据库中已创建
      const dbCategories = await db.select().from(categories);
      expect(dbCategories).toHaveLength(1);
      expect(dbCategories[0].name).toBe('新分类');
    });

    it('应使用默认值创建最简分类', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '最简分类',
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data.sortOrder).toBe(0); // 默认值
      expect(data.data.isVisible).toBe(true); // 默认值
    });

    it('应拒绝未认证的请求', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '未授权分类',
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('应拒绝空名称', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝过长的名称', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'x'.repeat(101),
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝过长的描述', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '测试',
          description: 'x'.repeat(501),
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝负数的 sortOrder', async () => {
      const response = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '测试',
          sortOrder: -1,
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  /**
   * PUT /categories/:id 测试（需认证）
   */
  describe('PUT /categories/:id', () => {
    it('应成功更新分类', async () => {
      const result = await db.insert(categories).values({
        name: '旧名称',
        description: '旧描述',
        sortOrder: 1,
        isVisible: true,
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '新名称',
          description: '新描述',
          icon: '🎨',
          sortOrder: 10,
          isVisible: false,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('分类更新成功');
      expect(data.data).toMatchObject({
        name: '新名称',
        description: '新描述',
        icon: '🎨',
        sortOrder: 10,
        isVisible: false,
      });

      // 验证数据库中已更新
      const dbCategory = await db.select().from(categories).where();
      expect(dbCategory[0].name).toBe('新名称');
      expect(dbCategory[0].isVisible).toBe(false);
    });

    it('应返回 404 当更新不存在的分类时', async () => {
      const response = await SELF.fetch('http://localhost/api/categories/999999', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '新名称',
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('应拒绝未认证的更新请求', async () => {
      const result = await db.insert(categories).values({
        name: '测试',
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '新名称',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('应保留未指定的可选字段原值', async () => {
      const result = await db.insert(categories).values({
        name: '原名称',
        sortOrder: 5,
        isVisible: true,
      });

      const categoryId = result.lastInsertRowid;

      // 只更新名称，不提供 sortOrder 和 isVisible
      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '新名称',
        }),
      });

      expect(response.status).toBe(200);

      // 验证原值被保留
      const dbCategory = await db.select().from(categories).where();
      expect(dbCategory[0].sortOrder).toBe(5); // 保持原值
      expect(dbCategory[0].isVisible).toBe(true); // 保持原值
    });
  });

  /**
   * DELETE /categories/:id 测试（需认证）
   */
  describe('DELETE /categories/:id', () => {
    it('应成功删除分类', async () => {
      const result = await db.insert(categories).values({
        name: '待删除分类',
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('分类删除成功');

      // 验证数据库中已删除
      const dbCategories = await db.select().from(categories);
      expect(dbCategories).toHaveLength(0);
    });

    it('应返回 404 当删除不存在的分类时', async () => {
      const response = await SELF.fetch('http://localhost/api/categories/999999', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('应拒绝未认证的删除请求', async () => {
      const result = await db.insert(categories).values({
        name: '测试',
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);

      // 验证未被删除
      const dbCategories = await db.select().from(categories);
      expect(dbCategories).toHaveLength(1);
    });
  });

  /**
   * PATCH /categories/:id/visibility 测试（需认证）
   */
  describe('PATCH /categories/:id/visibility', () => {
    it('应成功切换分类可见性（可见 -> 隐藏）', async () => {
      const result = await db.insert(categories).values({
        name: '可见分类',
        isVisible: true,
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}/visibility`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('分类已隐藏');
      expect(data.data.isVisible).toBe(false);

      // 验证数据库中已更新
      const dbCategory = await db.select().from(categories).where();
      expect(dbCategory[0].isVisible).toBe(false);
    });

    it('应成功切换分类可见性（隐藏 -> 可见）', async () => {
      const result = await db.insert(categories).values({
        name: '隐藏分类',
        isVisible: false,
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}/visibility`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('分类已显示');
      expect(data.data.isVisible).toBe(true);
    });

    it('应返回 404 当分类不存在时', async () => {
      const response = await SELF.fetch('http://localhost/api/categories/999999/visibility', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('应拒绝未认证的请求', async () => {
      const result = await db.insert(categories).values({
        name: '测试',
        isVisible: true,
      });

      const categoryId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/categories/${categoryId}/visibility`, {
        method: 'PATCH',
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * 集成测试: 完整的分类 CRUD 流程
   */
  describe('完整的分类 CRUD 流程', () => {
    it('应完成创建 -> 读取 -> 更新 -> 删除的完整流程', async () => {
      // 1. 创建分类
      const createResponse = await SELF.fetch('http://localhost/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'CRUD测试',
          description: '初始描述',
          sortOrder: 5,
        }),
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      const categoryId = createData.data.id;

      // 2. 读取分类详情
      const getResponse = await SELF.fetch(`http://localhost/categories/${categoryId}`);
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();
      expect(getData.data.name).toBe('CRUD测试');

      // 3. 更新分类
      const updateResponse = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'CRUD测试（已更新）',
          description: '更新后的描述',
          sortOrder: 10,
        }),
      });

      expect(updateResponse.status).toBe(200);

      // 4. 验证更新
      const getUpdatedResponse = await SELF.fetch(`http://localhost/categories/${categoryId}`);
      const getUpdatedData = await getUpdatedResponse.json();
      expect(getUpdatedData.data.name).toBe('CRUD测试（已更新）');
      expect(getUpdatedData.data.sortOrder).toBe(10);

      // 5. 删除分类
      const deleteResponse = await SELF.fetch(`http://localhost/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      // 6. 验证删除
      const getDeletedResponse = await SELF.fetch(`http://localhost/categories/${categoryId}`);
      expect(getDeletedResponse.status).toBe(404);
    });
  });
});
