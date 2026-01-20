import { useState, useEffect } from 'react';
import { Category, Link, CreateLinkRequest } from '@/types';
import { linkAPI } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface LinkFormProps {
  categories: Category[];
  link?: Link;
  onSubmit: (data: CreateLinkRequest) => Promise<void>;
  onCancel: () => void;
}

/**
 * 链接表单组件（创建/编辑）
 */
export function LinkForm({ categories, link, onSubmit, onCancel }: LinkFormProps) {
  const [formData, setFormData] = useState<CreateLinkRequest>({
    categoryId: link?.categoryId || categories[0]?.id || 0,
    title: link?.title || '',
    url: link?.url || '',
    description: link?.description || '',
    icon: link?.icon || '',
    sortOrder: link?.sortOrder || 0,
    isVisible: link?.isVisible ?? true,
  });

  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (link) {
      setFormData({
        categoryId: link.categoryId,
        title: link.title,
        url: link.url,
        description: link.description,
        icon: link.icon,
        sortOrder: link.sortOrder,
        isVisible: link.isVisible,
      });
    }
  }, [link]);

  const handleParseUrl = async () => {
    if (!formData.url) return;

    setIsParsing(true);
    try {
      const metadata = await linkAPI.parseUrl(formData.url);
      setFormData((prev) => ({
        ...prev,
        title: metadata.title || prev.title,
        description: metadata.description || prev.description,
        icon: metadata.icon || prev.icon,
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : '解析失败');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      alert(error instanceof Error ? error.message : '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
        <div className="flex space-x-2">
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com"
            required
          />
          <button
            type="button"
            onClick={handleParseUrl}
            disabled={isParsing || !formData.url}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isParsing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>自动获取</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">图标 URL（可选）</label>
        <input
          type="url"
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <span>{link ? '更新' : '创建'}</span>
        </button>
      </div>
    </form>
  );
}
