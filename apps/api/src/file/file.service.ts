import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

@Injectable()
export class FileService implements OnModuleInit {
  private readonly logger = new Logger(FileService.name);
  private client!: Minio.Client;
  private readonly bucket: string;
  private readonly presignedExpiry: number;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'moderns-milk');
    this.presignedExpiry = this.config.get<number>(
      'MINIO_PRESIGNED_EXPIRY',
      86400,
    );
  }

  onModuleInit(): void {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    const useSSL = this.config.get<boolean>('MINIO_USE_SSL', false);
    const accessKey = this.config.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretKey = this.config.getOrThrow<string>('MINIO_SECRET_KEY');

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket: ${this.bucket}`);
    }
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ key: string; url: string; size: number }> {
    await this.ensureBucket();
    const ext = extname(originalName) || '.bin';
    const key = `${randomUUID()}${ext}`;
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    const url = await this.client.presignedGetObject(
      this.bucket,
      key,
      this.presignedExpiry,
    );
    return { key, url, size: buffer.length };
  }

  async getPresignedUrl(key: string): Promise<string> {
    try {
      await this.client.statObject(this.bucket, key);
    } catch {
      throw new NotFoundException('File not found');
    }
    return this.client.presignedGetObject(
      this.bucket,
      key,
      this.presignedExpiry,
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch {
      throw new NotFoundException('File not found');
    }
  }
}
