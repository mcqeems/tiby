import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface PutObjectParams {
  key: string;
  body: Buffer;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>("S3_BUCKET")!;
    const endpoint = config.get<string>("S3_ENDPOINT")!;
    this.publicBaseUrl =
      config.get<string>("S3_PUBLIC_BASE_URL") || `${endpoint}/${this.bucket}`;
    this.client = new S3Client({
      region: config.get<string>("S3_REGION"),
      endpoint,
      forcePathStyle: config.get<boolean>("S3_FORCE_PATH_STYLE") ?? true,
      credentials: {
        accessKeyId: config.get<string>("S3_ACCESS_KEY_ID")!,
        secretAccessKey: config.get<string>("S3_SECRET_ACCESS_KEY")!,
      },
    });
  }

  /** Public-read bucket: publicity comes from bucket policy, no ACL param. */
  async putObject({ key, body, contentType }: PutObjectParams): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return this.buildPublicUrl(key);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  buildPublicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }
}
