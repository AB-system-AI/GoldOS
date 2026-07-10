const SENSITIVE_METADATA_KEYS = new Set(['resetUrl', 'verifyUrl', 'acceptUrl', 'code']);

export function sanitizeNotificationMetadata(
  metadata: Record<string, string> | undefined,
): Record<string, string> {
  if (!metadata) {
    return {};
  }

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SENSITIVE_METADATA_KEYS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
