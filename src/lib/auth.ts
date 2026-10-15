import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hashPassword, isValidPassword, isValidUserName, verifyPassword } from '@/lib/password';

export const SESSION_COOKIE = 'hm_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SECRET = process.env.APP_SECRET ?? 'head-metting-local-secret';

export interface CurrentUser {
  id: string;
  name: string;
}

function sign(userId: string) {
  return createHmac('sha256', SECRET).update(userId).digest('hex');
}

export function sessionCookieValue(userId: string) {
  return `${userId}.${sign(userId)}`;
}

export function isValidSessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const sep = value.indexOf('.');
  if (sep <= 0) return false;
  const userId = value.slice(0, sep);
  const mac = value.slice(sep + 1);
  const expected = Buffer.from(sign(userId), 'utf8');
  const actual = Buffer.from(mac, 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** 读取当前登录账号；未登录返回 null */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!isValidSessionCookie(raw)) return null;
  const userId = raw!.slice(0, raw!.indexOf('.'));
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  return user;
}

/** 页面用：未登录则跳登录页，带回来路 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect('/login');
}

export type AuthResult = { ok: true; userId: string; name: string } | { ok: false; error: string };

export async function verifyCredentials(name: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { name: name.trim() } });
  if (!user) return { ok: false, error: '账号或口令有误' };
  if (!verifyPassword(password, user.salt, user.passwordHash)) {
    return { ok: false, error: '账号或口令有误' };
  }
  return { ok: true, userId: user.id, name: user.name };
}

export async function createUser(name: string, password: string): Promise<AuthResult> {
  const trimmed = name.trim();
  if (!isValidUserName(trimmed)) return { ok: false, error: '账号名请控制在 1–16 字' };
  if (!isValidPassword(password)) return { ok: false, error: '口令至少 6 位' };

  const exists = await prisma.user.findUnique({ where: { name: trimmed } });
  if (exists) return { ok: false, error: '该账号名已被占用' };

  const { salt, hash } = hashPassword(password);
  const user = await prisma.user.create({ data: { name: trimmed, salt, passwordHash: hash } });
  return { ok: true, userId: user.id, name: user.name };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: '账号不存在' };
  if (!verifyPassword(oldPassword, user.salt, user.passwordHash)) {
    return { ok: false, error: '原口令不对' };
  }
  if (!isValidPassword(newPassword)) return { ok: false, error: '新口令至少 6 位' };

  const { salt, hash } = hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { salt, passwordHash: hash } });
  return { ok: true, userId: user.id, name: user.name };
}

export async function listUserNames(): Promise<{ id: string; name: string; createdAt: Date }[]> {
  return prisma.user.findMany({ select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
}

export async function hasAnyUser(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE,
};
