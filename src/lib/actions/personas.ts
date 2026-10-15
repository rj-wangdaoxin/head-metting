'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { toJson } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

const PersonaInput = z.object({
  figureId: z.string().min(1, '请先选择本体'),
  name: z.string().min(1, '请填写分身名').max(24, '分身名过长'),
  personalityOverride: z.string().max(200).optional().nullable(),
  toneStyle: z.string().max(20).optional().nullable(),
  knowledgeFocus: z.array(z.string()).max(8),
  stanceShift: z.string().max(200).optional().nullable(),
  extraPrompt: z.string().max(600).optional().nullable(),
  strictness: z.number().int().min(1).max(5),
});

export type PersonaFormValues = z.infer<typeof PersonaInput>;
export type ActionResult = { ok: boolean; id?: string; error?: string };

const unauthorized = (): ActionResult => ({ ok: false, error: '登录已失效，请重新登录' });

export async function createPersona(values: PersonaFormValues): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = PersonaInput.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '参数有误' };

  const figure = await prisma.figure.findUnique({ where: { id: parsed.data.figureId } });
  if (!figure) return { ok: false, error: '所选本体不存在' };

  const persona = await prisma.persona.create({
    data: {
      userId: user.id,
      figureId: parsed.data.figureId,
      name: parsed.data.name,
      personalityOverride: parsed.data.personalityOverride || null,
      toneStyle: parsed.data.toneStyle || null,
      knowledgeFocus: toJson(parsed.data.knowledgeFocus),
      stanceShift: parsed.data.stanceShift || null,
      extraPrompt: parsed.data.extraPrompt || null,
      strictness: parsed.data.strictness,
    },
  });

  revalidatePath('/personas');
  return { ok: true, id: persona.id };
}

export async function updatePersona(id: string, values: PersonaFormValues): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const parsed = PersonaInput.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '参数有误' };

  const exists = await prisma.persona.findFirst({ where: { id, userId: user.id } });
  if (!exists) return { ok: false, error: '分身不存在或不属于此账号' };

  await prisma.persona.update({
    where: { id },
    data: {
      name: parsed.data.name,
      personalityOverride: parsed.data.personalityOverride || null,
      toneStyle: parsed.data.toneStyle || null,
      knowledgeFocus: toJson(parsed.data.knowledgeFocus),
      stanceShift: parsed.data.stanceShift || null,
      extraPrompt: parsed.data.extraPrompt || null,
      strictness: parsed.data.strictness,
    },
  });

  revalidatePath('/personas');
  revalidatePath(`/personas/${id}/edit`);
  return { ok: true, id };
}

export async function deletePersona(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  await prisma.persona.deleteMany({ where: { id, userId: user.id } });
  revalidatePath('/personas');
  return { ok: true };
}

export async function duplicatePersona(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const source = await prisma.persona.findFirst({ where: { id, userId: user.id } });
  if (!source) return { ok: false, error: '分身不存在或不属于此账号' };

  const copy = await prisma.persona.create({
    data: {
      userId: user.id,
      figureId: source.figureId,
      name: `${source.name}·副本`,
      personalityOverride: source.personalityOverride,
      toneStyle: source.toneStyle,
      knowledgeFocus: source.knowledgeFocus,
      stanceShift: source.stanceShift,
      extraPrompt: source.extraPrompt,
      strictness: source.strictness,
    },
  });

  revalidatePath('/personas');
  return { ok: true, id: copy.id };
}
