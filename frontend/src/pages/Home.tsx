import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { CategorySection } from '@/components/CategorySection';
import { SearchBar } from '@/components/SearchBar';
import { categoryAPI, linkAPI } from '@/services/api';
import { Category, Link } from '@/types';
import { Loader2 } from 'lucide-react';

/**
 * 前台首页
 */
export function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, linksData] = await Promise.all([
        categoryAPI.getList(false), // 只获取可见分类
        linkAPI.getList({ showAll: false }), // 只获取可见链接
      ]);
      setCategories(categoriesData);
      setLinks(linksData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadData();
      return;
    }

    try {
      const results = await linkAPI.getList({ search: query, showAll: false });
      setLinks(results);
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  // 按分类分组链接
  const groupedLinks = categories.map((category) => ({
    category,
    links: links.filter((link) => link.categoryId === category.id),
  }));

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* 搜索栏 */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* 搜索结果提示 */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600">
            搜索 "{searchQuery}" 的结果：共 {links.length} 个链接
          </div>
        )}

        {/* 分类列表 */}
        {groupedLinks.length > 0 ? (
          groupedLinks
            .filter((group) => group.links.length > 0 || !searchQuery)
            .map((group) => (
              <CategorySection key={group.category.id} category={group.category} links={group.links} />
            ))
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">暂无内容</p>
            <p className="text-gray-400 text-sm mt-2">请联系管理员添加链接</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
