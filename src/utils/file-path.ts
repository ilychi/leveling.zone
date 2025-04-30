import fs from 'fs';
import path from 'path';

// 可能的数据库文件路径
const possibleDbPaths = [
  // Vercel服务器函数路径
  '/var/task/public/db',
  // Lambda函数路径
  process.env.LAMBDA_TASK_ROOT ? path.join(process.env.LAMBDA_TASK_ROOT, 'public', 'db') : null,
  // Vercel临时构建目录
  '/tmp/db',
  // Vercel运行时目录
  '/vercel/path0/public/db',
  // 环境变量定义的目录
  process.env.MMDB_PATH || null,
  // 本地开发路径
  path.join(process.cwd(), 'public', 'db'),
  // 数据路径
  path.join(process.cwd(), 'data', 'db'),
  // Vercel输出路径
  path.join(process.cwd(), '.vercel', 'output', 'static', 'db'),
  // Next.js静态文件路径
  path.join(process.cwd(), '.next', 'static', 'db'),
].filter(Boolean) as string[];

// CDN URL前缀
let cdnUrlPrefix: string | null = null;
if (typeof window !== 'undefined') {
  // 浏览器环境 - 使用相对路径
  cdnUrlPrefix = '/_next/static/db';
} else if (process.env.VERCEL_URL) {
  // Vercel环境 - 使用Vercel提供的URL
  cdnUrlPrefix = `https://${process.env.VERCEL_URL}/_next/static/db`;
}

// 辅助日志函数
function logDebug(message: string) {
  if (process.env.DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * 查找数据库文件的实际路径
 * @param filename 数据库文件名
 * @returns 文件的完整路径
 */
export function findDbFilePath(filename: string): string {
  // 如果提供了环境变量，优先使用
  if (process.env.MMDB_PATH) {
    const envPath = path.join(process.env.MMDB_PATH, filename);
    try {
      if (fs.existsSync(envPath)) {
        return envPath;
      }
    } catch (err) {
      logDebug(`检查环境变量MMDB_PATH路径失败: ${envPath}, 错误: ${(err as Error).message}`);
    }
  }

  // 尝试在各种可能的路径中查找
  for (const basePath of possibleDbPaths) {
    try {
      const fullPath = path.join(basePath, filename);
      if (fs.existsSync(fullPath)) {
        logDebug(`找到数据库文件: ${fullPath}`);
        return fullPath;
      }
    } catch (err) {
      // 忽略错误，继续尝试下一个路径
      logDebug(`检查路径失败: ${basePath}, 错误: ${(err as Error).message}`);
    }
  }

  // 如果所有路径都不存在，返回默认路径
  console.warn(`警告: 找不到数据库文件 ${filename}，使用默认路径`);

  // 查找可用目录
  const possibleDirs = [
    '/var/task',
    '/vercel/path0',
    process.cwd(),
    process.env.LAMBDA_TASK_ROOT,
  ].filter(Boolean) as string[];

  for (const dirPath of possibleDirs) {
    try {
      if (fs.existsSync(dirPath)) {
        logDebug(`目录存在: ${dirPath}`);
        try {
          const dirContents = fs.readdirSync(dirPath);
          logDebug(`${dirPath} 内容: ${JSON.stringify(dirContents, null, 2)}`);
        } catch (err) {
          logDebug(`无法读取目录 ${dirPath}: ${(err as Error).message}`);
        }

        // 检查public目录
        const publicDir = path.join(dirPath, 'public');
        if (fs.existsSync(publicDir)) {
          logDebug(`找到public目录: ${publicDir}`);

          // 检查db目录
          const dbDir = path.join(publicDir, 'db');
          if (fs.existsSync(dbDir)) {
            logDebug(`找到db目录: ${dbDir}`);

            // 检查数据库文件
            const dbFile = path.join(dbDir, filename);
            if (fs.existsSync(dbFile)) {
              logDebug(`找到数据库文件: ${dbFile}`);
              return dbFile;
            }
          }
        }
      } else {
        logDebug(`目录不存在: ${dirPath}`);
      }
    } catch (err) {
      logDebug(`检查目录失败: ${dirPath}, 错误: ${(err as Error).message}`);
    }
  }

  // 最后尝试检查/tmp目录
  try {
    const tmpDbDir = '/tmp/db';
    if (fs.existsSync(tmpDbDir)) {
      const tmpFile = path.join(tmpDbDir, filename);
      if (fs.existsSync(tmpFile)) {
        return tmpFile;
      }
    }
  } catch (err) {
    // 忽略错误
  }

  // 返回最可能的路径
  const defaultPath = path.join('/vercel/path0/public/db', filename);
  logDebug(`使用默认路径: ${defaultPath}`);
  return defaultPath;
}

/**
 * 获取数据库文件的CDN URL
 * @param filename 数据库文件名
 * @returns CDN URL 或 null
 */
export function getDbFileCdnUrl(filename: string): string | null {
  if (!cdnUrlPrefix) return null;
  return `${cdnUrlPrefix}/${filename}`;
}

/**
 * 获取数据库目录的实际路径
 * @returns 目录的完整路径
 */
export function getDbDirPath(): string {
  // 如果提供了环境变量，优先使用
  if (process.env.MMDB_PATH) {
    try {
      if (fs.existsSync(process.env.MMDB_PATH)) {
        return process.env.MMDB_PATH;
      }
    } catch (err) {
      // 忽略错误
    }
  }

  // 尝试在各种可能的路径中查找
  for (const basePath of possibleDbPaths) {
    try {
      if (fs.existsSync(basePath)) {
        logDebug(`找到数据库目录: ${basePath}`);
        return basePath;
      }
    } catch (err) {
      // 忽略错误，继续尝试下一个路径
    }
  }

  // 如果所有路径都不存在，返回默认路径
  return '/vercel/path0/public/db';
}
