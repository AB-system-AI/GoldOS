import type { AuditContext } from '@goldos/business';
import type { AuthContext } from '@goldos/auth';

import { getClientInfo, getRequestId } from '@/lib/http/request';

export function buildAuditContext(request: Request, auth: AuthContext): AuditContext {
  const client = getClientInfo(request);
  return {
    userId: auth.user.id,
    ipAddress: client.ipAddress ?? undefined,
    userAgent: client.userAgent ?? undefined,
    requestId: getRequestId(request),
  };
}
