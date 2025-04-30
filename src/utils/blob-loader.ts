import { list } from '@vercel/blob';

class BlobLoader {
  private static instance: BlobLoader;
  private blobCache: Map<string, Buffer> = new Map();
  private blobUrlCache: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): BlobLoader {
    if (!BlobLoader.instance) {
      BlobLoader.instance = new BlobLoader();
    }
    return BlobLoader.instance;
  }

  async getFileFromBlob(fileName: string): Promise<Buffer> {
    // 检查缓存中是否已有此文件
    if (this.blobCache.has(fileName)) {
      return this.blobCache.get(fileName)!;
    }

    try {
      // 尝试获取文件URL
      let fileUrl = this.blobUrlCache.get(fileName);

      if (!fileUrl) {
        // 如果没有缓存URL，尝试从blob列表中查找
        const { blobs } = await list({
          prefix: 'mmdb/',
        });

        const blobFile = blobs.find(blob => blob.pathname.endsWith(fileName));

        if (!blobFile) {
          throw new Error(`在Blob存储中找不到文件: ${fileName}`);
        }

        fileUrl = blobFile.url;
        this.blobUrlCache.set(fileName, fileUrl);
      }

      // 从URL获取文件内容
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`获取文件内容失败: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 缓存文件内容
      this.blobCache.set(fileName, buffer);

      return buffer;
    } catch (error) {
      console.error(`从Blob加载文件 ${fileName} 失败:`, error);
      throw error;
    }
  }
}

export default BlobLoader;
