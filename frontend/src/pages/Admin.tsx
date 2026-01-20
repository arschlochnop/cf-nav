import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { CategorySection } from '@/components/CategorySection';
import { LinkForm } from '@/components/LinkForm';
import { categoryAPI, linkAPI } from '@/services/api';
import { Category, Link, CreateLinkRequest, CreateCategoryRequest } from '@/types';
import { Plus, Loader2, FolderPlus } from 'lucide-react';

/**
 * 管理后台页面
 */
export function Admin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | undefined>();
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, linksData] = await Promise.all([
        categoryAPI.getList(true), // 获取所有分类
        linkAPI.getList({ showAll: true }), // 获取所有链接
      ]);
      setCategories(categoriesData);
      setLinks(linksData);
    } catch (error) {
      alert(error instanceof Error ? error.message : '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 链接操作
  const handleCreateLink = () => {
    setEditingLink(undefined);
    setShowLinkForm(true);
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setShowLinkForm(true);
  };

  const handleSubmitLink = async (data: CreateLinkRequest) => {
    try {
      if (editingLink) {
        await linkAPI.update(editingLink.id, data);
      } else {
        await linkAPI.create(data);
      }
      setShowLinkForm(false);
      setEditingLink(undefined);
      await loadData();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteLink = async (id: number) => {
    if (!confirm('确定删除这个链接吗？')) return;

    try {
      await linkAPI.delete(id);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleToggleLinkVisibility = async (id: number) => {
    try {
      await linkAPI.toggleVisibility(id);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  // 分类操作
  const handleCreateCategory = () => {
    setEditingCategory(undefined);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await categoryAPI.delete(id);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleToggleCategoryVisibility = async (id: number) => {
    try {
      await categoryAPI.toggleVisibility(id);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  // 按分类分组链接
  const groupedLinks = categories.map((category) => ({
    category,
    links: links.filter((link) => link.categoryId === category.id),
  }));

  if (isLoading) {
    return (
      <Layout showAdminNav>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showAdminNav>
      {/* 操作按钮 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">链接管理</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleCreateCategory}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
            <span>新建分类</span>
          </button>
          <button
            onClick={handleCreateLink}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>新建链接</span>
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">分类总数</div>
          <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">链接总数</div>
          <div className="text-2xl font-bold text-gray-900">{links.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">总点击量</div>
          <div className="text-2xl font-bold text-gray-900">
            {links.reduce((sum, link) => sum + link.clickCount, 0)}
          </div>
        </div>
      </div>

      {/* 分类列表 */}
      {groupedLinks.length > 0 ? (
        groupedLinks.map((group) => (
          <CategorySection
            key={group.category.id}
            category={group.category}
            links={group.links}
            isAdmin
            onEditLink={handleEditLink}
            onDeleteLink={handleDeleteLink}
            onToggleLinkVisibility={handleToggleLinkVisibility}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onToggleCategoryVisibility={handleToggleCategoryVisibility}
          />
        ))
      ) : (
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">暂无分类</p>
          <button
            onClick={handleCreateCategory}
            className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            创建第一个分类
          </button>
        </div>
      )}

      {/* 链接表单弹窗 */}
      {showLinkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{editingLink ? '编辑链接' : '新建链接'}</h2>
            <LinkForm
              categories={categories}
              link={editingLink}
              onSubmit={handleSubmitLink}
              onCancel={() => {
                setShowLinkForm(false);
                setEditingLink(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* 分类表单弹窗 */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? '编辑分类' : '新建分类'}
            </h2>
            <CategoryFormContent
              category={editingCategory}
              onSubmit={async (data) => {
                try {
                  if (editingCategory) {
                    await categoryAPI.update(editingCategory.id, data);
                  } else {
                    await categoryAPI.create(data);
                  }
                  setShowCategoryForm(false);
                  setEditingCategory(undefined);
                  await loadData();
                } catch (error) {
                  alert(error instanceof Error ? error.message : '操作失败');
                }
              }}
              onCancel={() => {
                setShowCategoryForm(false);
                setEditingCategory(undefined);
              }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

/**
 * 分类表单内容组件
 */
function CategoryFormContent({
  category,
  onSubmit,
  onCancel,
}: {
  category?: Category;
  onSubmit: (data: CreateCategoryRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateCategoryRequest>({
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || '',
    sortOrder: category?.sortOrder || 0,
    isVisible: category?.isVisible ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">分类名称</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          图标（可选，Emoji 或 URL）
        </label>
        <input
          type="text"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="📚 或 https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">排序权重</label>
          <input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            min="0"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2 pt-8">
            <input
              type="checkbox"
              checked={formData.isVisible}
              onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">显示在前台</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{category ? '更新' : '创建'}</span>
        </button>
      </div>
    </form>
  );
}
