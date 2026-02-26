import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_BUCKET', 'movie-prf');

    this.s3 = new S3Client({
      region: this.configService.get<string>('AWS_DEFAULT_REGION', 'ap-northeast-1'),
      endpoint: this.configService.get<string>('AWS_ENDPOINT'),
      forcePathStyle: true, // MinIO互換
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  /**
   * ファイルをS3にアップロード
   */
  async upload(key: string, body: Buffer | Readable, contentType?: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`S3アップロード完了: ${key}`);
  }

  /**
   * S3からファイルをダウンロード
   */
  async download(key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * S3からファイルを削除
   */
  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`S3削除完了: ${key}`);
  }

  /**
   * ファイルの存在確認
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイルの公開URLを取得
   */
  getUrl(key: string): string {
    const endpoint = this.configService.get<string>('AWS_URL');
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${key}`;
    }
    const region = this.configService.get<string>('AWS_DEFAULT_REGION', 'ap-northeast-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
