import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'production', 'test']);

export const serverEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  WEB_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type AppEnv = ServerEnv & ClientEnv;

export type EnvSource = Record<string, string | undefined>;

export function envErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
}

export function parseEnv<Output>(schema: z.ZodType<Output>, source: EnvSource): Output {
  try {
    return schema.parse(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid environment configuration:\n${envErrorMessage(error)}`);
    }
    throw error;
  }
}

export function createEnv<ServerOutput, ClientOutput>(options: {
  server: z.ZodType<ServerOutput>;
  client: z.ZodType<ClientOutput>;
  runtimeEnv: EnvSource;
  skipValidation?: boolean;
}): ServerOutput & ClientOutput {
  if (options.skipValidation) {
    return options.runtimeEnv as ServerOutput & ClientOutput;
  }

  const server = parseEnv(options.server, options.runtimeEnv);
  const client = parseEnv(options.client, options.runtimeEnv);

  return { ...server, ...client };
}

export { serverEnvSchema as defaultServerEnvSchema, clientEnvSchema as defaultClientEnvSchema };
