import { createHash } from 'crypto';

import type { ClientInfo } from '../types/index.js';

function parseBrowser(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Unknown';
}

function parseOperatingSystem(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function parseDeviceType(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function buildFingerprint(ipAddress: string | null, userAgent: string | null): string | null {
  if (!ipAddress && !userAgent) return null;
  return createHash('sha256')
    .update(`${ipAddress ?? ''}|${userAgent ?? ''}`)
    .digest('hex');
}

export function parseClientInfo(headers: Headers): ClientInfo {
  const forwarded = headers.get('x-forwarded-for');
  const ipAddress = forwarded?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? null;
  const userAgent = headers.get('user-agent');

  return {
    ipAddress,
    userAgent,
    countryCode: headers.get('cf-ipcountry') ?? headers.get('x-country-code'),
    city: headers.get('x-city'),
    browser: parseBrowser(userAgent),
    operatingSystem: parseOperatingSystem(userAgent),
    deviceType: parseDeviceType(userAgent),
    fingerprint: buildFingerprint(ipAddress, userAgent),
  };
}
