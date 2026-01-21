/**
 * 链接路由集成测试
 *
 * 测试范围:
 * - GET /links: 获取链接列表（支持分类筛选和搜索）
 * - GET /links/:id: 获取单个链接详情
 * - POST /links: 创建链接（需认证）
 * - PUT /links/:id: 更新链接（需认证）
 * - DELETE /links/:id: 删除链接（需认证）
 * - PATCH /links/:id/visibility: 切换链接可见性（需认证）
 * - POST /links/:id/click: 记录链接点击（公开）
 *
 * 测试策略:
 * - 正常场景: 验证 CRUD 操作和搜索功能
 * - 边界条件: 测试参数验证、外键约束等边界值
 * - 异常场景: 测试不存在的资源、无效关联等异常情况
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { categories, links, users } from '../../src/db/schema';
import { hashPassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';

describe('链接路由集成测试', () => {
  let db: ReturnType<typeof drizzle>;
  let authToken: string;
  let userId: number;
  let categoryId: number;

  beforeAll(async () => {
    // 初始化数据库连接
    db = drizzle(env.DB);

    // 创建测试用户（使用 .returning() 获取 ID）
    const userResult = await db
      .insert(users)
      .values({
        username: 'testadmin',
        password: await hashPassword('Test1234'),
        email: 'admin@example.com',
      })
      .returning({ id: users.id });

    userId = userResult[0].id;
    authToken = await generateToken(userId, 'testadmin', 'test-jwt-secret-key-for-vitest');
  });

  beforeEach(async () => {
    // 每个测试前清空链接和分类表
    await db.delete(links);
    await db.delete(categories);

    // 创建测试分类（使用 .returning() 获取 ID）
    const categoryResult = await db
      .insert(categories)
      .values({
        name: '测试分类',
        description: '用于测试的分类',
        sortOrder: 1,
        isVisible: true,
      })
      .returning({ id: categories.id });

    categoryId = categoryResult[0].id;
  });

  afterAll(async () => {
    // 测试完成后清理
    await db.delete(links);
    await db.delete(categories);
    await db.delete(users);
  });

  /**
   * GET /links 测试
   */
  describe('GET /links', () => {
    it('应返回所有可见的链接列表', async () => {
      // 创建测试链接
      await db.insert(links).values([
        {
          categoryId,
          title: 'Google',
          url: 'https://google.com',
          sortOrder: 10,
          isVisible: true,
        },
        {
          categoryId,
          title: 'GitHub',
          url: 'https://github.com',
          sortOrder: 5,
          isVisible: true,
        },
        {
          categoryId,
          title: '隐藏链接',
          url: 'https://hidden.com',
          sortOrder: 1,
          isVisible: false,
        },
      ]);

      const response = await SELF.fetch('http://localhost/api/links');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2); // 只返回可见的
      expect(data.data[0].title).toBe('Google'); // sortOrder 最高
      expect(data.data[1].title).toBe('GitHub');
    });

    it('应支持按分类筛选', async () => {
      // 创建另一个分类
      const category2Result = await db.insert(categories).values({
        name: '分类2',
      });
      const category2Id = category2Result.lastInsertRowid as number;

      // 创建不同分类的链接
      await db.insert(links).values([
        { categoryId, title: '分类1链接', url: 'https://cat1.com', isVisible: true },
        { categoryId: category2Id, title: '分类2链接', url: 'https://cat2.com', isVisible: true },
      ]);

      const response = await SELF.fetch(`http://localhost/links?categoryId=${categoryId}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('分类1链接');
    });

    it('应支持搜索功能（标题匹配）', async () => {
      await db.insert(links).values([
        { categoryId, title: 'Google Search', url: 'https://google.com', isVisible: true },
        { categoryId, title: 'GitHub Repo', url: 'https://github.com', isVisible: true },
        { categoryId, title: 'GitLab', url: 'https://gitlab.com', isVisible: true },
      ]);

      const response = await SELF.fetch('http://localhost/api/links?search=Git');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(2); // GitHub 和 GitLab
    });

    it('应支持搜索功能（描述匹配）', async () => {
      await db.insert(links).values([
        {
          categoryId,
          title: 'Site1',
          url: 'https://site1.com',
          description: '搜索引擎',
          isVisible: true,
        },
        {
          categoryId,
          title: 'Site2',
          url: 'https://site2.com',
          description: '代码仓库',
          isVisible: true,
        },
      ]);

      const response = await SELF.fetch('http://localhost/api/links?search=搜索');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Site1');
    });

    it('应在 showAll=true 时返回所有链接（包括隐藏）', async () => {
      await db.insert(links).values([
        { categoryId, title: '可见', url: 'https://visible.com', isVisible: true },
        { categoryId, title: '隐藏', url: 'https://hidden.com', isVisible: false },
      ]);

      const response = await SELF.fetch('http://localhost/api/links?showAll=true');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(2);
    });

    it('应返回空数组当没有链接时', async () => {
      const response = await SELF.fetch('http://localhost/api/links');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('应按 sortOrder 和 createdAt 降序排序', async () => {
      await db.insert(links).values([
        { categoryId, title: 'C', url: 'https://c.com', sortOrder: 5, isVisible: true },
        { categoryId, title: 'A', url: 'https://a.com', sortOrder: 10, isVisible: true },
        { categoryId, title: 'B', url: 'https://b.com', sortOrder: 10, isVisible: true },
      ]);

      const response = await SELF.fetch('http://localhost/api/links');

      const data = await response.json();
      expect(data.data[0].title).toBe('A'); // sortOrder 10, 先创建
      expect(data.data[1].title).toBe('B'); // sortOrder 10, 后创建
      expect(data.data[2].title).toBe('C'); // sortOrder 5
    });
  });

  /**
   * GET /links/:id 测试
   */
  describe('GET /links/:id', () => {
    it('应返回指定 ID 的链接详情', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: 'Google',
        url: 'https://google.com',
        description: '搜索引擎',
        icon: 'https://google.com/favicon.ico',
        sortOrder: 5,
        isVisible: true,
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        title: 'Google',
        url: 'https://google.com',
        description: '搜索引擎',
      });
    });

    it('应返回 404 当链接不存在时', async () => {
      const response = await SELF.fetch('http://localhost/api/links/999999');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('链接不存在');
      expect(data.code).toBe('LINK_NOT_FOUND');
    });
  });

  /**
   * POST /links 测试（需认证）
   */
  describe('POST /links', () => {
    it('应成功创建新链接', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: 'Google',
          url: 'https://google.com',
          description: '全球最大搜索引擎',
          icon: 'https://google.com/favicon.ico',
          sortOrder: 10,
          isVisible: true,
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('链接创建成功');
      expect(data.data).toMatchObject({
        title: 'Google',
        url: 'https://google.com',
      });
      expect(data.data.id).toBeDefined();

      // 验证数据库中已创建
      const dbLinks = await db.select().from(links);
      expect(dbLinks).toHaveLength(1);
      expect(dbLinks[0].title).toBe('Google');
    });

    it('应使用默认值创建最简链接', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: '最简链接',
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data.sortOrder).toBe(0); // 默认值
      expect(data.data.isVisible).toBe(true); // 默认值
    });

    it('应拒绝未认证的请求', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          title: '未授权链接',
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('应拒绝不存在的分类 ID', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId: 999999,
          title: '测试',
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('应拒绝无效的 URL 格式', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: '测试',
          url: 'not-a-valid-url',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('应拒绝空标题', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: '',
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('应拒绝过长的标题', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: 'x'.repeat(201),
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('应拒绝非正整数的分类 ID', async () => {
      const response = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId: -1,
          title: '测试',
          url: 'https://example.com',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  /**
   * PUT /links/:id 测试（需认证）
   */
  describe('PUT /links/:id', () => {
    it('应成功更新链接', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '旧标题',
        url: 'https://old.com',
        sortOrder: 1,
        isVisible: true,
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: '新标题',
          url: 'https://new.com',
          description: '更新后的描述',
          sortOrder: 10,
          isVisible: false,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('链接更新成功');

      // 验证数据库中已更新
      const dbLinks = await db.select().from(links);
      expect(dbLinks[0].title).toBe('新标题');
      expect(dbLinks[0].url).toBe('https://new.com');
      expect(dbLinks[0].isVisible).toBe(false);
    });

    it('应返回 404 当更新不存在的链接时', async () => {
      const response = await SELF.fetch('http://localhost/api/links/999999', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: '新标题',
          url: 'https://new.com',
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.code).toBe('LINK_NOT_FOUND');
    });

    it('应拒绝更新到不存在的分类', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '测试',
        url: 'https://test.com',
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId: 999999,
          title: '新标题',
          url: 'https://new.com',
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('应拒绝未认证的更新请求', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '测试',
        url: 'https://test.com',
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          title: '新标题',
          url: 'https://new.com',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * DELETE /links/:id 测试（需认证）
   */
  describe('DELETE /links/:id', () => {
    it('应成功删除链接', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '待删除',
        url: 'https://delete.com',
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('链接删除成功');

      // 验证数据库中已删除
      const dbLinks = await db.select().from(links);
      expect(dbLinks).toHaveLength(0);
    });

    it('应返回 404 当删除不存在的链接时', async () => {
      const response = await SELF.fetch('http://localhost/api/links/999999', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('应拒绝未认证的删除请求', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '测试',
        url: 'https://test.com',
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * PATCH /links/:id/visibility 测试（需认证）
   */
  describe('PATCH /links/:id/visibility', () => {
    it('应成功切换链接可见性（可见 -> 隐藏）', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '可见链接',
        url: 'https://visible.com',
        isVisible: true,
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}/visibility`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('链接已隐藏');
      expect(data.data.isVisible).toBe(false);
    });

    it('应成功切换链接可见性（隐藏 -> 可见）', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '隐藏链接',
        url: 'https://hidden.com',
        isVisible: false,
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}/visibility`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe('链接已显示');
      expect(data.data.isVisible).toBe(true);
    });

    it('应返回 404 当链接不存在时', async () => {
      const response = await SELF.fetch('http://localhost/api/links/999999/visibility', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('应拒绝未认证的请求', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: '测试',
        url: 'https://test.com',
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}/visibility`, {
        method: 'PATCH',
      });

      expect(response.status).toBe(401);
    });
  });

  /**
   * POST /links/:id/click 测试（公开）
   */
  describe('POST /links/:id/click', () => {
    it('应成功记录链接点击', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: 'Google',
        url: 'https://google.com',
        clickCount: 0,
      });

      const linkId = result.lastInsertRowid;

      const response = await SELF.fetch(`http://localhost/links/${linkId}/click`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // 验证点击次数已增加
      const dbLinks = await db.select().from(links);
      expect(dbLinks[0].clickCount).toBe(1);
    });

    it('应累计多次点击', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: 'Google',
        url: 'https://google.com',
        clickCount: 5,
      });

      const linkId = result.lastInsertRowid;

      // 点击 3 次
      await SELF.fetch(`http://localhost/links/${linkId}/click`, { method: 'POST' });
      await SELF.fetch(`http://localhost/links/${linkId}/click`, { method: 'POST' });
      await SELF.fetch(`http://localhost/links/${linkId}/click`, { method: 'POST' });

      // 验证点击次数
      const dbLinks = await db.select().from(links);
      expect(dbLinks[0].clickCount).toBe(8); // 5 + 3
    });

    it('应在链接不存在时静默处理（不抛错）', async () => {
      const response = await SELF.fetch('http://localhost/api/links/999999/click', {
        method: 'POST',
      });

      // 点击统计失败不影响用户体验
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('应允许未认证用户记录点击', async () => {
      const result = await db.insert(links).values({
        categoryId,
        title: 'Public Link',
        url: 'https://public.com',
        clickCount: 0,
      });

      const linkId = result.lastInsertRowid;

      // 无需认证
      const response = await SELF.fetch(`http://localhost/links/${linkId}/click`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
    });
  });

  /**
   * 集成测试: 完整的链接 CRUD 流程
   */
  describe('完整的链接 CRUD 流程', () => {
    it('应完成创建 -> 读取 -> 更新 -> 点击 -> 删除的完整流程', async () => {
      // 1. 创建链接
      const createResponse = await SELF.fetch('http://localhost/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: 'CRUD测试',
          url: 'https://crud-test.com',
          sortOrder: 5,
        }),
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      const linkId = createData.data.id;

      // 2. 读取链接详情
      const getResponse = await SELF.fetch(`http://localhost/links/${linkId}`);
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();
      expect(getData.data.title).toBe('CRUD测试');

      // 3. 更新链接
      const updateResponse = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          categoryId,
          title: 'CRUD测试（已更新）',
          url: 'https://crud-test-updated.com',
          sortOrder: 10,
        }),
      });

      expect(updateResponse.status).toBe(200);

      // 4. 记录点击
      const clickResponse = await SELF.fetch(`http://localhost/links/${linkId}/click`, {
        method: 'POST',
      });
      expect(clickResponse.status).toBe(200);

      // 5. 验证点击次数
      const getClickedResponse = await SELF.fetch(`http://localhost/links/${linkId}`);
      const getClickedData = await getClickedResponse.json();
      expect(getClickedData.data.clickCount).toBe(1);

      // 6. 删除链接
      const deleteResponse = await SELF.fetch(`http://localhost/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      // 7. 验证删除
      const getDeletedResponse = await SELF.fetch(`http://localhost/links/${linkId}`);
      expect(getDeletedResponse.status).toBe(404);
    });
  });
});
