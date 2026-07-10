import { TOTP, Secret } from 'otpauth';

import { generateSecureToken } from './password.js';

export function generateTotpSecret(): string {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  const totp = new TOTP({
    issuer: 'GoldOS',
    label: 'GoldOS',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const delta = totp.validate({ token: code, window });
  return delta !== null;
}

export function buildOtpAuthUri(secret: string, accountName: string, issuer = 'GoldOS'): string {
  const totp = new TOTP({
    issuer,
    label: accountName,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return totp.toString();
}

export function generateRecoveryCode(): string {
  return generateSecureToken(16).slice(0, 10).toUpperCase();
}
