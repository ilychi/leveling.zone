import fs from 'fs';
import path from 'path';
import { findDbFilePath } from './file-path';
import { BlobStorage } from './blob-storage';

/**
 * 数据库加载器 - 处理在Vercel环境中文件路径问题
 */
export class DbLoader {
  private static instance: DbLoader;
  private cache: Map<string, Buffer> = new Map();
  private blobStorage: BlobStorage;

  // 调试模式启用
  private debug: boolean = process.env.NODE_ENV !== 'production' || !!process.env.DEBUG;

  private constructor() {
    this.blobStorage = BlobStorage.getInstance();

    if (this.debug) {
      console.log('初始化数据库加载器');

      // 检查当前工作目录
      console.log(`当前工作目录: ${process.cwd()}`);

      // 验证环境变量
      console.log(`MMDB_PATH环境变量: ${process.env.MMDB_PATH || '未设置'}`);
      console.log(`NODE_ENV环境变量: ${process.env.NODE_ENV || '未设置'}`);
      console.log(`VERCEL环境变量: ${process.env.VERCEL || '未设置'}`);
      console.log(`LAMBDA_TASK_ROOT环境变量: ${process.env.LAMBDA_TASK_ROOT || '未设置'}`);
      console.log(
        `BLOB_READ_WRITE_TOKEN环境变量: ${process.env.BLOB_READ_WRITE_TOKEN ? '已设置' : '未设置'}`
      );

      // 检查可能的目录
      [
        '/var/task/public/db',
        '/tmp/db',
        '/vercel/path0/public/db',
        path.join(process.cwd(), 'public', 'db'),
        path.join(process.cwd(), '.vercel', 'output', 'static', 'db'),
      ].forEach(dir => {
        try {
          if (fs.existsSync(dir)) {
            console.log(`目录存在: ${dir}`);
            try {
              const files = fs.readdirSync(dir);
              console.log(`${dir} 包含 ${files.length} 个文件: ${files.join(', ')}`);
            } catch (err) {
              console.log(`无法读取目录 ${dir}: ${(err as Error).message}`);
            }
          } else {
            console.log(`目录不存在: ${dir}`);
          }
        } catch (err) {
          console.log(`检查目录 ${dir} 时出错: ${(err as Error).message}`);
        }
      });
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DbLoader {
    if (!DbLoader.instance) {
      DbLoader.instance = new DbLoader();
    }
    return DbLoader.instance;
  }

  /**
   * 加载数据库文件
   * @param filename 文件名
   * @returns 文件内容的Buffer
   */
  public async loadDbFile(filename: string): Promise<Buffer> {
    try {
      // 首先检查缓存
      if (this.cache.has(filename)) {
        return this.cache.get(filename)!;
      }

      // 尝试从Blob存储中获取
      if (this.debug) {
        console.log(`尝试从Blob存储加载数据库文件: ${filename}`);
      }

      try {
        // 检查Blob存储中是否存在文件
        const exists = await this.blobStorage.fileExists(filename);

        if (exists) {
          if (this.debug) {
            console.log(`在Blob存储中找到文件: ${filename}`);
          }

          const buffer = await this.blobStorage.getDbFile(filename);
          this.cache.set(filename, buffer);
          return buffer;
        } else if (this.debug) {
          console.log(`Blob存储中未找到文件: ${filename}`);
        }
      } catch (err) {
        if (this.debug) {
          console.warn(`从Blob存储加载文件失败: ${(err as Error).message}`);
        }
      }

      // 如果从Blob存储获取失败，尝试从本地文件系统获取
      if (this.debug) {
        console.log(`尝试从本地文件系统加载数据库文件: ${filename}`);
      }

      // 查找文件路径
      const dbPath = findDbFilePath(filename);

      if (this.debug) {
        console.log(`尝试加载本地数据库文件: ${dbPath}`);
      }

      // 检查文件是否存在
      if (!fs.existsSync(dbPath)) {
        if (this.debug) {
          const dir = path.dirname(dbPath);
          if (fs.existsSync(dir)) {
            console.log(`目录存在: ${dir}`);
            console.log(`${dir} 内容: ${fs.readdirSync(dir)}`);
          } else {
            console.log(`目录不存在: ${dir}`);
          }
        }

        throw new Error(`数据库文件不存在: ${dbPath}`);
      }

      // 读取文件
      const fileContent = fs.readFileSync(dbPath);

      // 存入缓存
      this.cache.set(filename, fileContent);

      return fileContent;
    } catch (err) {
      console.error(`加载数据库文件 ${filename} 失败:`, err);
      throw err;
    }
  }

  /**
   * 检查文件是否存在
   * @param filename 文件名
   * @returns 是否存在
   */
  public async dbFileExists(filename: string): Promise<boolean> {
    try {
      // 首先检查Blob存储
      const existsInBlob = await this.blobStorage.fileExists(filename);
      if (existsInBlob) return true;

      // 然后检查本地文件系统
      const dbPath = findDbFilePath(filename);
      return fs.existsSync(dbPath);
    } catch (err) {
      console.warn(`检查文件 ${filename} 是否存在时出错:`, err);
      return false;
    }
  }

  /**
   * 获取数据库文件大小
   * @param filename 文件名
   * @returns 文件大小(字节)
   */
  public async getDbFileSize(filename: string): Promise<number> {
    try {
      // 尝试从缓存获取
      if (this.cache.has(filename)) {
        return this.cache.get(filename)!.length;
      }

      // 从Blob存储获取信息
      try {
        const exists = await this.blobStorage.fileExists(filename);
        if (exists) {
          // 直接获取文件内容来确定大小
          const buffer = await this.blobStorage.getDbFile(filename);
          return buffer.length;
        }
      } catch (err) {
        // 忽略错误，尝试本地文件
      }

      // 尝试本地文件
      const dbPath = findDbFilePath(filename);
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        return stats.size;
      }

      return 0;
    } catch (err) {
      console.warn(`获取文件 ${filename} 大小时出错:`, err);
      return 0;
    }
  }

  /**
   * 列出可用的数据库文件
   * @returns 文件名列表
   */
  public async listAvailableDbFiles(): Promise<string[]> {
    const availableFiles: Set<string> = new Set();

    // 从Blob存储获取文件列表
    try {
      const blobFiles = await this.blobStorage.listDbFiles();
      blobFiles.forEach(file => availableFiles.add(file));
    } catch (err) {
      console.warn('从Blob存储获取文件列表失败:', err);
    }

    // 从本地文件系统获取文件列表
    const checkedPaths: Set<string> = new Set();
    [
      '/var/task/public/db',
      '/tmp/db',
      '/vercel/path0/public/db',
      path.join(process.cwd(), 'public', 'db'),
      path.join(process.cwd(), '.vercel', 'output', 'static', 'db'),
    ].forEach(dir => {
      try {
        if (fs.existsSync(dir) && !checkedPaths.has(dir)) {
          checkedPaths.add(dir);
          const files = fs.readdirSync(dir);
          files.forEach(file => availableFiles.add(file));
        }
      } catch (err) {
        // 忽略错误
      }
    });

    return Array.from(availableFiles);
  }
}
