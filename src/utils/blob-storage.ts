import { put, list, del, head } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const BLOB_PREFIX = 'mmdb';

/**
 * Vercel Blob存储服务 - 用于存储和获取数据库文件
 */
export class BlobStorage {
  private static instance: BlobStorage;
  // 添加URL缓存
  private urlCache: Map<string, string> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): BlobStorage {
    if (!BlobStorage.instance) {
      BlobStorage.instance = new BlobStorage();
    }
    return BlobStorage.instance;
  }

  /**
   * 上传数据库文件到Blob存储
   * @param filename 文件名
   * @param filePath 本地文件路径
   * @returns 上传结果
   */
  public async uploadDbFile(filename: string, filePath: string): Promise<{ url: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath);
      const blobKey = `${BLOB_PREFIX}/${filename}`;

      const { url } = await put(blobKey, fileContent, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log(`上传 ${filename} 到Blob存储成功，URL: ${url}`);
      return { url };
    } catch (error) {
      console.error(`上传 ${filename} 到Blob存储失败:`, error);
      throw error;
    }
  }

  /**
   * 从Blob存储获取数据库文件
   * @param filename 文件名
   * @returns 文件内容Buffer
   */
  public async getDbFile(filename: string): Promise<Buffer> {
    try {
      const blobKey = `${BLOB_PREFIX}/${filename}`;
      const blob = await head(blobKey);

      if (!blob) {
        throw new Error(`Blob存储中不存在文件: ${blobKey}`);
      }

      const response = await fetch(blob.url);

      if (!response.ok) {
        throw new Error(`获取文件失败: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`从Blob存储获取 ${filename} 失败:`, error);
      throw error;
    }
  }

  /**
   * 列出Blob存储中的数据库文件
   * @returns 文件列表
   */
  public async listDbFiles(): Promise<string[]> {
    try {
      const { blobs } = await list({ prefix: BLOB_PREFIX });
      return blobs.map(blob => blob.pathname.replace(`${BLOB_PREFIX}/`, ''));
    } catch (error) {
      console.error('列出Blob存储中的文件失败:', error);
      throw error;
    }
  }

  /**
   * 从Blob存储删除数据库文件
   * @param filename 文件名
   */
  public async deleteDbFile(filename: string): Promise<void> {
    try {
      const blobKey = `${BLOB_PREFIX}/${filename}`;
      await del(blobKey);
      console.log(`从Blob存储删除 ${filename} 成功`);
    } catch (error) {
      console.error(`从Blob存储删除 ${filename} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取数据库文件URL
   * @param filename 文件名
   * @returns 文件URL
   */
  public async getDbFileUrl(filename: string): Promise<string> {
    // 检查缓存
    if (this.urlCache.has(filename)) {
      return this.urlCache.get(filename)!;
    }

    try {
      // 尝试通过head获取文件信息
      const blobKey = `${BLOB_PREFIX}/${filename}`;
      const blob = await head(blobKey);

      if (blob) {
        this.urlCache.set(filename, blob.url);
        return blob.url;
      }

      // 如果head失败，尝试list查找
      const { blobs } = await list({ prefix: blobKey });
      const matchingBlob = blobs.find(b => b.pathname === blobKey);

      if (matchingBlob) {
        this.urlCache.set(filename, matchingBlob.url);
        return matchingBlob.url;
      }

      throw new Error(`在Blob存储中找不到文件: ${blobKey}`);
    } catch (error) {
      console.error(`获取Blob URL失败:`, error);

      // 如果API调用失败，尝试使用备选URL格式
      const fallbackUrl = `https://${
        process.env.VERCEL_BLOB_STORE_ID || 'your-store-id'
      }.public.blob.vercel-storage.com/${BLOB_PREFIX}/${filename}`;
      console.warn(`使用备选URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * 检查Blob存储中是否存在文件
   * @param filename 文件名
   * @returns 是否存在
   */
  public async fileExists(filename: string): Promise<boolean> {
    try {
      const blobKey = `${BLOB_PREFIX}/${filename}`;
      const blob = await head(blobKey);
      return !!blob;
    } catch (error) {
      return false;
    }
  }
}
