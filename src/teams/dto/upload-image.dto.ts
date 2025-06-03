export interface UploadFileDto {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}
