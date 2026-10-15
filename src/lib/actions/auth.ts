'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  changePassword,
  createUser,
  getCurrentUser,
  isSignupAllowed,
  sessionCookieValue,
  verifyCredentials,
} from '@/lib/auth';

export type AuthActionResult = { ok: true; name: string } | { ok: false; error: string };

function fail(error: string): AuthActionResult {
  return { ok: false, error };
}

export async function loginAction(input: {
  name: string;
  password: string;
}): Promise<AuthActionResult> {
  const name = (input?.name ?? '').trim();
  const password = input?.password ?? '';
  if (!name || !password) return fail('请填写账号与口令');

  const result = await verifyCredentials(name, password);
  if (!result.ok) return fail(result.error);

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookieValue(result.userId), SESSION_COOKIE_OPTIONS);
  return { ok: true, name: result.name };
}

export async function registerAction(input: {
  name: string;
  password: string;
  confirm: string;
}): Promise<AuthActionResult> {
  if (!(await isSignupAllowed())) return fail('本站已停止新立账号，请向站长索取');

  const password = input?.password ?? '';
  if (password !== (input?.confirm ?? '')) return fail('两次输入的口令不一致');

  const result = await createUser(input?.name ?? '', password);
  if (!result.ok) return fail(result.error);

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookieValue(result.userId), SESSION_COOKIE_OPTIONS);
  return { ok: true, name: result.name };
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function changePasswordAction(input: {
  oldPassword: string;
  newPassword: string;
  confirm: string;
}): Promise<AuthActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('登录已失效，请重新登录');
  if (input.newPassword !== input.confirm) return fail('两次输入的新口令不一致');

  const result = await changePassword(user.id, input.oldPassword ?? '', input.newPassword ?? '');
  if (!result.ok) return fail(result.error);
  return { ok: true, name: result.name };
}
