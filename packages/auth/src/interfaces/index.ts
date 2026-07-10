import type { AuthCredentials, AuthSession, AuthUser, TwoFactorChallenge } from '../types/index.js';

export interface AuthProviderAdapter {
  readonly name: string;
  authenticate(credentials: AuthCredentials): Promise<AuthUser | null>;
}

export interface SessionStore {
  create(session: AuthSession): Promise<AuthSession>;
  getById(sessionId: string): Promise<AuthSession | null>;
  revoke(sessionId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  touch(sessionId: string): Promise<void>;
}

export interface PermissionResolver {
  resolvePermissions(userId: string, tenantId: string): Promise<string[]>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
}

export interface TwoFactorProvider {
  createChallenge(userId: string): Promise<TwoFactorChallenge>;
  verifyChallenge(sessionId: string, code: string): Promise<boolean>;
}

export interface AuthService {
  signIn(credentials: AuthCredentials): Promise<AuthSession>;
  signOut(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  refreshSession(sessionId: string): Promise<AuthSession>;
}
