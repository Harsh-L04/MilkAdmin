import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles } from '../common/auth/roles.decorator';
import { FileService } from './file.service';

interface UploadedFileData {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller('files')
export class FileController {
  constructor(private readonly files: FileService) {}

  @Post('upload')
  @Roles('ADMIN', 'SALES_HEAD', 'SALES_OFFICER', 'DISTRIBUTOR')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: UploadedFileData) {
    if (!file) {
      return { error: 'No file provided' };
    }
    const result = await this.files.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return {
      key: result.key,
      url: result.url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: result.size,
    };
  }

  @Post('presigned-upload')
  @Roles('ADMIN', 'SALES_HEAD', 'SALES_OFFICER', 'DISTRIBUTOR')
  @HttpCode(200)
  async presignedUpload(@Body('originalName') originalName: string) {
    if (!originalName) return { error: 'originalName is required' };
    const result = await this.files.getPresignedUploadUrl(originalName);
    return { key: result.key, url: result.url };
  }

  @Get(':key')
  @Roles('ADMIN', 'SALES_HEAD', 'SALES_OFFICER', 'DISTRIBUTOR')
  async getFile(@Param('key') key: string, @Res() res: Response) {
    const url = await this.files.getPresignedUrl(key);
    return res.redirect(url);
  }
}
