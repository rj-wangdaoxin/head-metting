'use server';

import { revalidatePath } from 'next/cache';
import { createDebateSession, previewStancePlan } from '@/lib/debate';
import type { ParticipantInput } from '@/lib/debate';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** 开辩前立阵：依各人生平推演命题与阵营，返回后可在界面上改 */
export async function previewStances(input: {
  topic: string;
  background?: string;
  participants: ParticipantInput[];
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: '登录已失效，请重新登录' };

  return previewStancePlan(input.topic, input.background ?? null, input.participants, user.id);
}

export async function startDebate(input: {
  topic: string;
  background?: string;
  participants: ParticipantInput[];
  roundLimit: number;
  allowJudgment: boolean;
  language?: string;
  motion?: string | null;
  stances?: (string | null)[];
  claims?: (string | null)[];
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: '登录已失效，请重新登录' };

  const result = await createDebateSession(input, user.id);
  if (result.ok && result.id) revalidatePath('/debate/history');
  return result;
}

export async function removeSession(id: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: '登录已失效，请重新登录' };

  await prisma.debateSession.deleteMany({ where: { id, userId: user.id } });
  revalidatePath('/debate/history');
  return { ok: true as const };
}
