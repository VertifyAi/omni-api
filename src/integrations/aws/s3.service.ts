import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { UploadFileDto } from 'src/teams/dto/upload-image.dto';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required');
    }

    this.s3 = new S3Client({
      region: 'us-east-2',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Uploads a file to the S3 bucket
   * @param file - The file to upload
   * @returns The URL of the uploaded file
   */
  async uploadFile(file: UploadFileDto) {
    const command = new PutObjectCommand({
      Bucket: 'omni-profile-images',
      Key: file.originalname,
      Body: file.buffer,
    });
    await this.s3.send(command);
    return `https://omni-profile-images.s3.us-east-2.amazonaws.com/${file.originalname}`;
  }
}
