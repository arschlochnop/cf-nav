import { Link as LinkType } from '@/types';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { linkAPI } from '@/services/api';

interface LinkCardProps {
  link: LinkType;
  isAdmin?: boolean;
  onEdit?: (link: LinkType) => void;
  onDelete?: (id: number) => void;
  onToggleVisibility?: (id: number) => void;
}

/**
 * 链接卡片组件
 */
export function LinkCard({
  link,
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleVisibility,
}: LinkCardProps) {
  const handleClick = () => {
    // 记录点击统计
    if (!isAdmin) {
      linkAPI.recordClick(link.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden',
        !link.isVisible && isAdmin && 'opacity-50'
      )}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block p-4"
      >
        <div className="flex items-start space-x-3">
          {/* 图标 */}
          <div className="flex-shrink-0">
            {link.icon ? (
              <img
                src={link.icon}
                alt={link.title}
                referrerPolicy="no-referrer" // 防止向第三方网站泄露 Referer 信息
                className="w-10 h-10 rounded-lg object-cover"
                onError={(e) => {
                  // 图标加载失败时显示默认图标
                  e.currentTarget.src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-primary-600" />
              </div>
            )}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {link.title}
            </h3>
            {link.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{link.description}</p>
            )}
            {isAdmin && (
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                <span>点击: {link.clickCount}</span>
                <span>排序: {link.sortOrder}</span>
              </div>
            )}
          </div>
        </div>
      </a>

      {/* 管理员操作按钮 */}
      {isAdmin && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
          <button
            onClick={() => onToggleVisibility?.(link.id)}
            className="p-1.5 bg-white rounded shadow-md hover:bg-gray-50 transition-colors"
            title={link.isVisible ? '隐藏' : '显示'}
          >
            {link.isVisible ? (
              <Eye className="w-4 h-4 text-gray-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onEdit?.(link)}
            className="p-1.5 bg-white rounded shadow-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs text-blue-600">编辑</span>
          </button>
          <button
            onClick={() => onDelete?.(link.id)}
            className="p-1.5 bg-white rounded shadow-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs text-red-600">删除</span>
          </button>
        </div>
      )}
    </div>
  );
}
