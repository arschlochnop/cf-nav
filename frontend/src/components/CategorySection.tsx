import { Category, Link } from '@/types';
import { LinkCard } from './LinkCard';
import { Eye, EyeOff } from 'lucide-react';

interface CategorySectionProps {
  category: Category;
  links: Link[];
  isAdmin?: boolean;
  onEditLink?: (link: Link) => void;
  onDeleteLink?: (id: number) => void;
  onToggleLinkVisibility?: (id: number) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (id: number) => void;
  onToggleCategoryVisibility?: (id: number) => void;
}

/**
 * 分类区块组件
 */
export function CategorySection({
  category,
  links,
  isAdmin = false,
  onEditLink,
  onDeleteLink,
  onToggleLinkVisibility,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryVisibility,
}: CategorySectionProps) {
  return (
    <section className="mb-8">
      {/* 分类标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {category.icon && <span className="text-2xl">{category.icon}</span>}
          <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
          {category.description && (
            <p className="text-sm text-gray-500">({category.description})</p>
          )}
          {!category.isVisible && isAdmin && (
            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">已隐藏</span>
          )}
        </div>

        {/* 管理员操作 */}
        {isAdmin && (
          <div className="flex space-x-2">
            <button
              onClick={() => onToggleCategoryVisibility?.(category.id)}
              className="px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1"
            >
              {category.isVisible ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>隐藏</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>显示</span>
                </>
              )}
            </button>
            <button
              onClick={() => onEditCategory?.(category)}
              className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              编辑分类
            </button>
            <button
              onClick={() => {
                if (confirm(`确定删除分类"${category.name}"？这将同时删除该分类下的所有链接。`)) {
                  onDeleteCategory?.(category.id);
                }
              }}
              className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              删除分类
            </button>
          </div>
        )}
      </div>

      {/* 链接网格 */}
      {links.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              isAdmin={isAdmin}
              onEdit={onEditLink}
              onDelete={onDeleteLink}
              onToggleVisibility={onToggleLinkVisibility}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">该分类下暂无链接</p>
        </div>
      )}
    </section>
  );
}
