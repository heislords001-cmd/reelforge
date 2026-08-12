import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface UploadResult {
  url: string;
  storageKey: string;
}

export interface StorageDriver {
  upload(buffer: Buffer, opts: { folder: string; contentType: string; extension: string }): Promise<UploadResult>;
  delete(storageKey: string): Promise<void>;
}

/** S3 / any S3-compatible store (AWS, Cloudflare R2, DigitalOcean Spaces, MinIO). */
class S3StorageDriver implements StorageDriver {
  private s3: import('aws-sdk').S3 | null = null;

  private client() {
    if (!this.s3) {
      // Lazy import keeps aws-sdk out of the hot path when Cloudinary is the active driver.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3({
        region: env.storage.s3.region,
        endpoint: env.storage.s3.endpoint || undefined,
        accessKeyId: env.storage.s3.accessKeyId,
        secretAccessKey: env.storage.s3.secretAccessKey,
        s3ForcePathStyle: Boolean(env.storage.s3.endpoint),
      });
    }
    return this.s3!;
  }

  async upload(buffer: Buffer, opts: { folder: string; contentType: string; extension: string }): Promise<UploadResult> {
    const key = `${opts.folder}/${uuid()}.${opts.extension}`;
    await this.client()
      .putObject({
        Bucket: env.storage.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: opts.contentType,
        ACL: 'public-read',
      })
      .promise();

    const base = env.storage.s3.publicBaseUrl || `https://${env.storage.s3.bucket}.s3.${env.storage.s3.region}.amazonaws.com`;
    return { url: `${base}/${key}`, storageKey: key };
  }

  async delete(storageKey: string): Promise<void> {
    await this.client().deleteObject({ Bucket: env.storage.s3.bucket, Key: storageKey }).promise();
  }
}

class CloudinaryStorageDriver implements StorageDriver {
  private configured = false;

  private client() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cloudinary = require('cloudinary').v2;
    if (!this.configured) {
      cloudinary.config({
        cloud_name: env.storage.cloudinary.cloudName,
        api_key: env.storage.cloudinary.apiKey,
        api_secret: env.storage.cloudinary.apiSecret,
      });
      this.configured = true;
    }
    return cloudinary;
  }

  async upload(buffer: Buffer, opts: { folder: string; contentType: string }): Promise<UploadResult> {
    const cloudinary = this.client();
    const resourceType = opts.contentType.startsWith('audio') ? 'video' : 'image'; // Cloudinary stores audio under "video"
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: opts.folder, resource_type: resourceType },
        (err: unknown, result: { secure_url: string; public_id: string }) => {
          if (err || !result) return reject(ApiError.upstream('Cloudinary upload failed', err));
          resolve({ url: result.secure_url, storageKey: result.public_id });
        }
      );
      stream.end(buffer);
    });
  }

  async delete(storageKey: string): Promise<void> {
    const cloudinary = this.client();
    await cloudinary.uploader.destroy(storageKey);
  }
}

const driver: StorageDriver = env.storage.driver === 'cloudinary' ? new CloudinaryStorageDriver() : new S3StorageDriver();

export const storageService = {
  uploadImage: (buffer: Buffer, contentType: string) =>
    driver.upload(buffer, { folder: 'scene-images', contentType, extension: contentType.includes('png') ? 'png' : 'jpg' }),
  uploadAudio: (buffer: Buffer, contentType: string) =>
    driver.upload(buffer, { folder: 'voice-tracks', contentType, extension: 'mp3' }),
  delete: (storageKey: string) => driver.delete(storageKey),
};
