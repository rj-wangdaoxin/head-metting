import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/** 后台门禁：部署到公网后设 ADMIN_PASSWORD 即启用，本地不设则照旧直入 */
export const ADMIN_COOKIE = 'hm_admin';
const ADMIN_MAX_AGE = 60 * 60 * 8;
const SECRET = process.env.APP_SECRET ?? 'head-metting-local-secret';

export function adminGateEnabled(): boolean {
  return Boolean((process.env.ADMIN_PASSWORD ?? '').trim());
}

function sign(payload: string) {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function adminCookieValue(): string {
  const stamp = String(Date.now());
  return `${stamp}.${sign(stamp)}`;
}

export function isValidAdminCookie(value: string | undefined): boolean {
  if (!value) return false;
  const sep = value.indexOf('.');
  if (sep <= 0) return false;
  const stamp = value.slice(0, sep);
  const mac = value.slice(sep + 1);
  const expected = Buffer.from(sign(stamp), 'utf8');
  const actual = Buffer.from(mac, 'utf8');
  if (expected.length !== actual.length) return false;
  if (!Number.isFinite(Number(stamp)) || Date.now() - Number(stamp) > ADMIN_MAX_AGE * 1000) return false;
  return timingSafeEqual(expected, actual);
}

/** 服务端统一校验：未启用门禁则放行；启用但未解锁则一律拒绝 */
export async function adminUnlocked(): Promise<boolean> {
  if (!adminGateEnabled()) return true;
  const store = await cookies();
  return isValidAdminCookie(store.get(ADMIN_COOKIE)?.value);
}

export function verifyAdminPassword(input: string): boolean {
  const expected = Buffer.from((process.env.ADMIN_PASSWORD ?? '').trim(), 'utf8');
  const actual = Buffer.from((input ?? '').trim(), 'utf8');
  if (!expected.length || expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ADMIN_MAX_AGE,
};
