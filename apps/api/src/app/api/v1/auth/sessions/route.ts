import type { Session } from '@goldos/database';

import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);
  const { sessionService } = getAuthContainer();
  const sessions = await sessionService.listSessions(auth.user.id);

  return jsonOk(
    {
      sessions: sessions.map((session: Session) => ({
        id: session.id,
        status: session.status,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt.toISOString(),
        lastActiveAt: session.lastActiveAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        current: session.id === auth.session.id,
      })),
    },
    requestId,
  );
});
