import { createHash, randomBytes } from 'crypto';

import bcrypt from 'bcryptjs';

import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${String(MIN_PASSWORD_LENGTH)} characters`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

export function assertPasswordStrength(password: string): void {
  const result = validatePasswordStrength(password);
  if (!result.valid) {
    throw new AuthError(AuthErrorCodes.PASSWORD_TOO_WEAK, result.errors.join('; '), {
      details: result.errors.map((message) => ({
        field: 'password',
        code: AuthErrorCodes.PASSWORD_TOO_WEAK,
        message,
      })),
    });
  }
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
