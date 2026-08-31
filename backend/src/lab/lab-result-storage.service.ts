import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { basename, join, resolve } from 'path';

@Injectable()
export class LabResultStorageService {
  private readonly root: string;

  constructor(private readonly config: ConfigService) {
    this.root = resolve(
      this.config.get<string>('LAB_RESULT_STORAGE_DIR') ||
      join(process.cwd(), 'storage', 'lab-results'),
    );
  }

  async savePdf(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('PDF_REQUIRED');
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    if (!isPdf) throw new BadRequestException('ONLY_PDF_ALLOWED');
    if (file.size > 15 * 1024 * 1024) throw new BadRequestException('PDF_TOO_LARGE');

    await fs.mkdir(this.root, { recursive: true });
    const key = `${randomUUID()}.pdf`;
    await fs.writeFile(join(this.root, key), file.buffer);
    return {
      key,
      originalName: String(file.originalname || 'result.pdf').slice(0, 250),
      mimeType: 'application/pdf',
      fileSize: file.size,
    };
  }

  private safePath(key: string) {
    const name = basename(String(key || ''));
    if (!name || name !== key || !/^[a-f0-9-]+\.pdf$/i.test(name)) {
      throw new NotFoundException('RESULT_FILE_NOT_FOUND');
    }
    return join(this.root, name);
  }

  async stat(key: string) {
    try {
      return await fs.stat(this.safePath(key));
    } catch {
      throw new NotFoundException('RESULT_FILE_NOT_FOUND');
    }
  }

  stream(key: string) {
    return createReadStream(this.safePath(key));
  }
}
