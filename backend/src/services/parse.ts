/**
 * 网站信息抓取服务
 * 用于自动获取网站标题、描述、图标等元信息
 */

/**
 * 网站元信息接口
 */
export interface WebsiteMetadata {
  title: string;
  description?: string;
  icon?: string;
  url: string;
}

/**
 * 从 HTML 中提取元信息
 * @param html HTML 内容
 * @param url 原始 URL（用于处理相对路径）
 * @returns 网站元信息
 */
function extractMetadataFromHTML(html: string, url: string): WebsiteMetadata {
  const metadata: WebsiteMetadata = {
    title: '',
    url,
  };

  // 提取 title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // 提取 meta description
  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }

  // 提取 Open Graph description（备选）
  if (!metadata.description) {
    const ogDescMatch = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
    );
    if (ogDescMatch) {
      metadata.description = ogDescMatch[1].trim();
    }
  }

  // 提取 favicon
  const iconMatch = html.match(
    /<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i
  );
  if (iconMatch) {
    const iconUrl = iconMatch[1];
    // 处理相对路径
    metadata.icon = iconUrl.startsWith('http')
      ? iconUrl
      : new URL(iconUrl, url).href;
  }

  // 如果没找到 favicon，尝试使用默认路径
  if (!metadata.icon) {
    try {
      const urlObj = new URL(url);
      metadata.icon = `${urlObj.origin}/favicon.ico`;
    } catch (error) {
      console.error('解析 URL 失败:', error);
    }
  }

  return metadata;
}

/**
 * 解析网站信息
 * @param url 要解析的网站 URL
 * @returns 网站元信息
 */
export async function parseWebsiteMetadata(url: string): Promise<WebsiteMetadata> {
  try {
    // 验证 URL 格式
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('仅支持 HTTP/HTTPS 协议');
    }

    // 发起 HTTP 请求获取 HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      // 超时设置（Cloudflare Workers 限制）
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 只读取前 50KB 内容（避免大文件）
    const text = await response.text();
    const limitedHtml = text.slice(0, 50000);

    // 提取元信息
    const metadata = extractMetadataFromHTML(limitedHtml, url);

    // 如果没有标题，使用域名作为标题
    if (!metadata.title) {
      metadata.title = urlObj.hostname;
    }

    return metadata;
  } catch (error) {
    // 解析失败时返回基础信息
    console.error('解析网站信息失败:', error);

    let fallbackTitle = url;
    try {
      const urlObj = new URL(url);
      fallbackTitle = urlObj.hostname;
    } catch {
      // 忽略 URL 解析错误
    }

    return {
      title: fallbackTitle,
      description: '自动获取网站信息失败，请手动填写',
      url,
    };
  }
}

/**
 * 批量解析网站信息
 * @param urls URL 列表
 * @returns 网站元信息列表
 */
export async function batchParseWebsiteMetadata(
  urls: string[]
): Promise<WebsiteMetadata[]> {
  // 并发请求（限制并发数为 5，避免过载）
  const batchSize = 5;
  const results: WebsiteMetadata[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((url) => parseWebsiteMetadata(url))
    );
    results.push(...batchResults);
  }

  return results;
}
