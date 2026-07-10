import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const twoFactorVerifySchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().min(6).max(10),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const emailVerifyRequestSchema = z.object({});

export const emailVerifySchema = z.object({
  token: z.string().min(1),
});

export const phoneVerifyRequestSchema = z.object({
  phone: z.string().min(5).max(30),
});

export const phoneVerifySchema = z.object({
  phone: z.string().min(5).max(30),
  code: z.string().min(4).max(10),
});

export const twoFactorSetupSchema = z.object({});

export const twoFactorDisableSchema = z.object({
  code: z.string().min(6).max(10),
});

export const invitationCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  branchId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  employeeId: z.string().uuid().optional(),
});

export const invitationAcceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});
