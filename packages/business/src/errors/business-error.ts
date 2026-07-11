export const BusinessErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type BusinessErrorCode = (typeof BusinessErrorCodes)[keyof typeof BusinessErrorCodes];

export class BusinessError extends Error {
  readonly code: BusinessErrorCode;
  readonly statusCode: number;
  readonly details?: { field: string; code: string; message: string }[];

  constructor(
    code: BusinessErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      details?: { field: string; code: string; message: string }[];
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = options?.statusCode ?? BusinessError.statusCodeFor(code);
    this.details = options?.details;
  }

  static statusCodeFor(code: BusinessErrorCode): number {
    switch (code) {
      case BusinessErrorCodes.NOT_FOUND:
        return 404;
      case BusinessErrorCodes.FORBIDDEN:
      case BusinessErrorCodes.TENANT_MISMATCH:
        return 403;
      case BusinessErrorCodes.ALREADY_EXISTS:
      case BusinessErrorCodes.CONFLICT:
        return 409;
      case BusinessErrorCodes.VALIDATION_ERROR:
        return 400;
      default:
        return 500;
    }
  }
}
