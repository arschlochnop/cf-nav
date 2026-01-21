/**
 * 时间格式化工具函数
 *
 * 老王我把这个函数提取出来，避免重复代码（DRY 原则）
 */

/**
 * 格式化最后更新时间
 *
 * 功能说明：
 * - 将 Unix timestamp（秒）转换为人类可读的相对时间
 * - 处理服务器与客户端时间偏差（< 5 秒显示"刚刚"）
 * - 支持未来时间容错（防止时钟不同步导致显示负数）
 *
 * 时间格式：
 * - < 5 秒：刚刚
 * - < 60 秒：X 秒前
 * - < 3600 秒：X 分钟前
 * - < 86400 秒：X 小时前
 * - >= 86400 秒：X 天前
 *
 * @param timestamp Unix timestamp（秒）
 * @returns 格式化后的时间字符串
 *
 * @example
 * formatLastUpdated(Date.now() / 1000 - 30) // "30 秒前"
 * formatLastUpdated(Date.now() / 1000 - 3) // "刚刚"
 * formatLastUpdated(Date.now() / 1000 + 3) // "刚刚"（处理未来时间）
 */
export function formatLastUpdated(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // 处理服务器和客户端时间偏差：当时间差小于 5 秒（包括负数）时，显示"刚刚"
  if (diffSeconds < 5) {
    return '刚刚';
  } else if (diffSeconds < 60) {
    return `${diffSeconds} 秒前`;
  } else if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)} 分钟前`;
  } else if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)} 小时前`;
  } else {
    return `${Math.floor(diffSeconds / 86400)} 天前`;
  }
}

/**
 * 格式化最后检测时间（支持 null 值）
 *
 * 功能说明：
 * - 如果 timestamp 为 null/undefined，返回"暂无数据"
 * - 否则调用 formatLastUpdated 格式化时间
 *
 * @param timestamp Unix timestamp（秒）或 null
 * @returns 格式化后的时间字符串或"暂无数据"
 *
 * @example
 * formatLastChecked(null) // "暂无数据"
 * formatLastChecked(Date.now() / 1000 - 300) // "5 分钟前"
 */
export function formatLastChecked(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) {
    return '暂无数据';
  }

  // 处理未来时间（时钟不同步超过 1 分钟）
  const now = Date.now() / 1000;
  if (timestamp - now > 60) {
    return '暂无数据';
  }

  return formatLastUpdated(timestamp);
}

/**
 * 格式化为绝对时间（YYYY-MM-DD HH:mm:ss）
 *
 * 功能说明：
 * - 将 Unix timestamp（秒）转换为绝对时间格式
 * - 格式：2026-01-21 14:30:25
 * - 支持 null 值处理
 *
 * @param timestamp Unix timestamp（秒）或 null
 * @returns 格式化后的绝对时间字符串或"暂无数据"
 *
 * @example
 * formatAbsoluteTime(1737465025) // "2026-01-21 14:30:25"
 * formatAbsoluteTime(null) // "暂无数据"
 */
export function formatAbsoluteTime(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) {
    return '暂无数据';
  }

  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
