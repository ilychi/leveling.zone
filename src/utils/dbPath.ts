import path from 'path';
import fs from 'fs';

/**
 * 获取数据库文件路径，根据环境自动选择正确的路径
 * @param filename 数据库文件名
 * @returns 完整的文件路径
 */
export function getDbPath(filename: string): string {
  // 可能的路径列表，按优先级排序
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'db', filename),
    path.join(process.cwd(), 'public', 'db', filename),
    path.join('/var/task', 'public', 'db', filename), // Vercel serverless环境
    path.join(process.cwd(), '.vercel', 'output', 'static', 'db', filename),
  ];

  // 找到第一个存在的路径
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (error) {
      console.log(`Path check error for ${p}:`, error);
    }
  }

  // 如果找不到，返回默认路径并记录警告
  console.warn(`警告: 找不到数据库文件 ${filename}，使用默认路径`);
  return path.join(process.cwd(), 'public', 'db', filename);
}
