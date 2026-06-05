import fs from "fs/promises";
import path from "path";

export interface StorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  constructor() { this.baseDir = process.env.UPLOAD_DIR || "./uploads"; }

  async upload(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return `/api/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    await fs.unlink(filePath).catch(() => {});
  }
}

class S3StorageProvider implements StorageProvider {
  async upload(): Promise<string> {
    throw new Error("S3 storage requires @aws-sdk/client-s3. Install it and implement S3StorageProvider.");
  }
  async delete(): Promise<void> {
    throw new Error("S3 storage requires @aws-sdk/client-s3.");
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;
  const type = process.env.STORAGE_PROVIDER || "local";
  provider = type === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  return provider;
}
