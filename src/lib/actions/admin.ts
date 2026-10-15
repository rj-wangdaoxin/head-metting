'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { updateSettings } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  adminCookieValue,
  adminUnlocked,
  verifyAdminPassword,
} from '@/lib/admin-gate';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

/** 解锁后台：口令正确则种下签名 cookie，八小时后自动失效 */
export async function unlockAdminAction(input: { password: string }): Promise<{ ok: boolean; error?: string }> {
  const password = (input?.password ?? '').trim();
  if (!password) return { ok: false, error: '请输入管理口令' };
  if (!verifyAdminPassword(password)) return { ok: false, error: '口令不对' };

  const store = await cookies();
  store.set(ADMIN_COOKIE, adminCookieValue(), ADMIN_COOKIE_OPTIONS);
  return { ok: true };
}

/** 上锁：清掉 cookie，下次进后台需重新输入口令 */
export async function lockAdminAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  revalidatePath('/admin');
}

export async function saveSettings(patch: Record<string, string>) {
  if (!(await adminUnlocked())) return { ok: false as const, error: '后台已上锁，请先输入管理口令' };
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: '登录已失效，请重新登录' };

  await updateSettings(user.id, patch);
  revalidatePath('/admin');
  revalidatePath('/debate');
  return { ok: true as const };
}

export async function toggleFigure(id: string, enabled: boolean) {
  if (!(await adminUnlocked())) return { ok: false as const, error: '后台已上锁，请先输入管理口令' };
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: '登录已失效，请重新登录' };

  await prisma.figure.update({ where: { id }, data: { enabled } });
  revalidatePath('/admin');
  revalidatePath('/figures');
  return { ok: true as const };
}

async function writeAvatar(slug: string, buffer: Buffer) {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
  const out = path.join(AVATAR_DIR, `${slug}.jpg`);
  await sharp(buffer).resize(256, 256, { fit: 'cover', position: 'top' }).jpeg({ quality: 82 }).toFile(out);
  return `/avatars/${slug}.jpg`;
}

export async function setFigureAvatarFromUrl(id: string, url: string) {
  if (!(await adminUnlocked())) return { ok: false as const, error: '后台已上锁，请先输入管理口令' };
  if (!(await getCurrentUser())) return { ok: false as const, error: '登录已失效，请重新登录' };

  const figure = await prisma.figure.findUnique({ where: { id } });
  if (!figure) return { ok: false as const, error: '人物不存在' };
  const target = url.trim();
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    return { ok: false as const, error: '请填写 http(s) 图片地址' };
  }

  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(20000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return { ok: false as const, error: '该地址不是可用图片' };
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 2048) return { ok: false as const, error: '图片过小' };
    const publicPath = await writeAvatar(figure.slug, buffer);
    await prisma.figure.update({
      where: { id },
      data: { avatarUrl: publicPath, avatarKind: 'IMAGE', avatarSource: target },
    });
    revalidatePath('/admin');
    revalidatePath('/figures');
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: `下载失败：${(err as Error).message}` };
  }
}

export async function setFigureAvatarFromFile(formData: FormData) {
  if (!(await adminUnlocked())) return { ok: false as const, error: '后台已上锁，请先输入管理口令' };
  if (!(await getCurrentUser())) return { ok: false as const, error: '登录已失效，请重新登录' };

  const id = String(formData.get('figureId') ?? '');
  const file = formData.get('file');
  if (!id || !(file instanceof File)) return { ok: false as const, error: '缺少人物或文件' };

  const figure = await prisma.figure.findUnique({ where: { id } });
  if (!figure) return { ok: false as const, error: '人物不存在' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicPath = await writeAvatar(figure.slug, buffer);
  await prisma.figure.update({
    where: { id },
    data: { avatarUrl: publicPath, avatarKind: 'IMAGE', avatarSource: `本地上传：${file.name}` },
  });
  revalidatePath('/admin');
  revalidatePath('/figures');
  return { ok: true as const };
}

export async function clearFigureAvatar(id: string) {
  if (!(await adminUnlocked())) return { ok: false as const, error: '后台已上锁，请先输入管理口令' };
  if (!(await getCurrentUser())) return { ok: false as const, error: '登录已失效，请重新登录' };

  await prisma.figure.update({
    where: { id },
    data: { avatarUrl: null, avatarKind: 'DEFAULT', avatarSource: null },
  });
  revalidatePath('/admin');
  revalidatePath('/figures');
  return { ok: true as const };
}
