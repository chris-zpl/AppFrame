import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { EncryptionService } from '../../../core/security/encryption.service';

export interface Generated2faDetails {
  secret: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

@Injectable()
export class TwoFactorService {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Gera novo segredo TOTP, QR Code e 8 códigos de recuperação únicos
   */
  async generateSecret(userEmail: string): Promise<Generated2faDetails> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'AppFrame',
      label: userEmail,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    const recoveryCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      recoveryCodes.push(`${part1}-${part2}`);
    }

    return {
      secret,
      qrCodeDataUrl,
      recoveryCodes,
    };
  }

  /**
   * Valida o token TOTP de 6 dígitos contra o segredo em texto puro
   */
  verifyToken(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    try {
      const result = verifySync({ token: token.trim(), secret });
      return !!result?.valid;
    } catch {
      return false;
    }
  }

  /**
   * Valida e consome um código de recuperação
   */
  verifyRecoveryCode(
    inputCode: string,
    existingCodes: string[] | null,
  ): { isValid: boolean; remainingCodes: string[] } {
    if (!inputCode || !existingCodes || existingCodes.length === 0) {
      return { isValid: false, remainingCodes: existingCodes || [] };
    }

    const normalizedInput = inputCode.trim().toUpperCase();
    const index = existingCodes.findIndex(
      (code) => code.toUpperCase() === normalizedInput,
    );

    if (index === -1) {
      return { isValid: false, remainingCodes: existingCodes };
    }

    // Remove o código usado para evitar reutilização
    const remainingCodes = [...existingCodes];
    remainingCodes.splice(index, 1);

    return { isValid: true, remainingCodes };
  }
}
