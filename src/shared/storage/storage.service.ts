import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IStorageService {
  saveFile(subDirectory: string, fileName: string, buffer: Buffer): Promise<string>;
  deleteFile(filePath: string): Promise<boolean>;
  fileExists(filePath: string): Promise<boolean>;
}

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadRoot = path.resolve(process.cwd(), 'uploads');

  async saveFile(
    subDirectory: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    const targetDir = path.join(this.uploadRoot, subDirectory);
    await fs.mkdir(targetDir, { recursive: true });
    const fullPath = path.join(targetDir, fileName);
    await fs.writeFile(fullPath, buffer);
    return path.relative(process.cwd(), fullPath);
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (err) {
      this.logger.warn(`Falha ao remover arquivo: ${filePath}`);
      return false;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
