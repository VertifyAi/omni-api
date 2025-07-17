import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
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
   * @param bucketName - The bucket name
   * @returns The URL of the uploaded file
   */
  async uploadFile(
    file: UploadFileDto,
    bucketName: string = 'omni-profile-images',
  ) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: file.originalname,
      Body: file.buffer,
    });
    await this.s3.send(command);
    return `https://omni-profile-images.s3.us-east-2.amazonaws.com/${file.originalname}`;
  }

  /**
   * Uploads an audio file to the S3 bucket
   * @param audioBuffer - The audio buffer to upload
   * @param fileName - The name of the file
   * @param contentType - The MIME type of the audio file
   * @returns The URL of the uploaded file
   */
  async uploadAudioFile(
    audioBuffer: Buffer,
    fileName: string,
    contentType: string = 'audio/ogg',
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: 'omni-whatsapp-audios',
      Key: `audios/${fileName}`,
      Body: audioBuffer,
      ContentType: contentType,
    });

    await this.s3.send(command);
    return `https://omni-whatsapp-audios.s3.us-east-2.amazonaws.com/audios/${fileName}`;
  }

  async deleteFile(fileUrl: string) {
    const key = fileUrl.split('/').pop();
    const command = new DeleteObjectCommand({
      Bucket: 'omni-profile-images',
      Key: key,
    });
    await this.s3.send(command);
  }
}
