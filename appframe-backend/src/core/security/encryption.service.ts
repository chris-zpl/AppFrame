import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!rawKey) {
      // Chave padrão para desenvolvimento caso não esteja definida em .env
      this.key = crypto.scryptSync('appframe-default-secret-salt-2026', 'salt', 32);
    } else if (rawKey.length === 64) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  /**
   * Criptografa texto puro usando AES-256-GCM.
   * Retorna formato 'iv:authTag:encryptedContent' em hexadecimal.
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;
    try {
      const iv = crypto.randomBytes(12); // 96 bits recomendado para GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      throw new InternalServerErrorException('Falha na criptografia de dados sensíveis.');
    }
  }

  /**
   * Descriptografa texto cifrado em formato 'iv:authTag:encryptedContent'.
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) return ciphertext;
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Formato inválido de payload criptografado.');
      }
      const [ivHex, authTagHex, encryptedData] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException('Falha na descriptografia de dados sensíveis.');
    }
  }

  /**
   * Criptografa objeto (como recovery_codes) em formato JSON cifrado.
   */
  encryptJson<T>(data: T): string {
    if (!data) return null;
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Descriptografa string cifrada para objeto JSON tipado.
   */
  decryptJson<T>(ciphertext: string): T {
    if (!ciphertext) return null;
    const jsonStr = this.decrypt(ciphertext);
    return JSON.parse(jsonStr) as T;
  }
}
