import { prisma } from '@/lib/db';
import { parseJson } from '@/lib/utils';
import { avatarMeta } from '@/lib/avatars';
import type { Figure, Persona } from '@prisma/client';

export interface FigureView {
  id: string;
  slug: string;
  name: string;
  courtesy: string | null;
  dynasty: string;
  category: string;
  birthYear: number | null;
  deathYear: number | null;
  birthplace: string | null;
  roles: string[];
  biography: string;
  personalityTraits: string[];
  speakingStyle: { selfAddress: string; tone: string; catchphrases: string[] };
  thoughts: string;
  quotes: { text: string; source: string }[];
  anecdotes: string[];
  expertise: string[];
  taboos: string[];
  sources: string[];
  inkColor: string;
  avatarUrl: string | null;
  avatarKind: string;
  avatarSource: string | null;
  enabled: boolean;
}

export function toFigureView(figure: Figure): FigureView {
  return {
    id: figure.id,
    slug: figure.slug,
    name: figure.name,
    courtesy: figure.courtesy,
    dynasty: figure.dynasty,
    category: figure.category,
    birthYear: figure.birthYear,
    deathYear: figure.deathYear,
    birthplace: figure.birthplace,
    roles: parseJson<string[]>(figure.roles, []),
    biography: figure.biography,
    personalityTraits: parseJson<string[]>(figure.personalityTraits, []),
    speakingStyle: parseJson<{ selfAddress: string; tone: string; catchphrases: string[] }>(figure.speakingStyle, {
      selfAddress: '',
      tone: '',
      catchphrases: [],
    }),
    thoughts: figure.thoughts,
    quotes: parseJson<{ text: string; source: string }[]>(figure.quotes, []),
    anecdotes: parseJson<string[]>(figure.anecdotes, []),
    expertise: parseJson<string[]>(figure.expertise, []),
    taboos: parseJson<string[]>(figure.taboos, []),
    sources: parseJson<string[]>(figure.sources, []),
    inkColor: figure.inkColor,
    avatarUrl: figure.avatarUrl,
    avatarKind: figure.avatarKind,
    avatarSource: figure.avatarSource,
    enabled: figure.enabled,
  };
}

export async function listFigures(opts: {
  dynasty?: string | null;
  category?: string | null;
  q?: string | null;
  enabledOnly?: boolean;
} = {}) {
  const { dynasty, category, q, enabledOnly = true } = opts;
  const keyword = q?.trim();

  const rows = await prisma.figure.findMany({
    where: {
      ...(enabledOnly ? { enabled: true } : {}),
      ...(dynasty ? { dynasty } : {}),
      ...(category ? { category } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { courtesy: { contains: keyword } },
              { thoughts: { contains: keyword } },
              { expertise: { contains: keyword } },
              { biography: { contains: keyword } },
            ],
          }
        : {}),
    },
    orderBy: [{ dynastyOrder: 'asc' }, { birthYear: 'asc' }],
  });

  return rows.map(toFigureView);
}

/** 列表卡片用：只取卡片渲染所需的字段，避免整份档案进入 RSC 负载 */
export interface FigureCardView {
  id: string;
  slug: string;
  name: string;
  courtesy: string | null;
  dynasty: string;
  category: string;
  birthYear: number | null;
  deathYear: number | null;
  biography: string;
  thoughts: string;
  personalityTraits: string[];
  expertise: string[];
  inkColor: string;
  avatarUrl: string | null;
  avatarKind: string;
}

export async function listFigureCards(opts: {
  dynasty?: string | null;
  category?: string | null;
  q?: string | null;
  enabledOnly?: boolean;
} = {}): Promise<FigureCardView[]> {
  const { dynasty, category, q, enabledOnly = true } = opts;
  const keyword = q?.trim();

  const rows = await prisma.figure.findMany({
    where: {
      ...(enabledOnly ? { enabled: true } : {}),
      ...(dynasty ? { dynasty } : {}),
      ...(category ? { category } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { courtesy: { contains: keyword } },
              { thoughts: { contains: keyword } },
              { expertise: { contains: keyword } },
              { biography: { contains: keyword } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      courtesy: true,
      dynasty: true,
      category: true,
      birthYear: true,
      deathYear: true,
      biography: true,
      thoughts: true,
      personalityTraits: true,
      expertise: true,
      inkColor: true,
      avatarUrl: true,
      avatarKind: true,
    },
    orderBy: [{ dynastyOrder: 'asc' }, { birthYear: 'asc' }],
  });

  return rows.map((row) => ({
    ...row,
    personalityTraits: parseJson<string[]>(row.personalityTraits, []),
    expertise: parseJson<string[]>(row.expertise, []),
  }));
}

export async function getFigureBySlug(slug: string) {
  const row = await prisma.figure.findUnique({ where: { slug } });
  return row ? toFigureView(row) : null;
}

export async function getFigureById(id: string) {
  const row = await prisma.figure.findUnique({ where: { id } });
  return row ? toFigureView(row) : null;
}

export interface PersonaView {
  id: string;
  name: string;
  personalityOverride: string | null;
  toneStyle: string | null;
  knowledgeFocus: string[];
  stanceShift: string | null;
  extraPrompt: string | null;
  strictness: number;
  createdAt: Date;
  updatedAt: Date;
  figure: FigureView;
}

export function toPersonaView(persona: Persona & { figure: Figure }): PersonaView {
  return {
    id: persona.id,
    name: persona.name,
    personalityOverride: persona.personalityOverride,
    toneStyle: persona.toneStyle,
    knowledgeFocus: parseJson<string[]>(persona.knowledgeFocus, []),
    stanceShift: persona.stanceShift,
    extraPrompt: persona.extraPrompt,
    strictness: persona.strictness,
    createdAt: persona.createdAt,
    updatedAt: persona.updatedAt,
    figure: toFigureView(persona.figure),
  };
}

export async function listPersonas(userId: string) {
  const rows = await prisma.persona.findMany({
    where: { userId },
    include: { figure: true },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toPersonaView);
}

export async function getPersona(id: string, userId: string) {
  const row = await prisma.persona.findFirst({ where: { id, userId }, include: { figure: true } });
  return row ? toPersonaView(row) : null;
}

/** 选角用：可参与辩论的角色（本体 + 本账号的分身） */
export async function getCastOptions(userId: string) {
  const [figures, personas] = await Promise.all([
    prisma.figure.findMany({ where: { enabled: true }, orderBy: [{ dynastyOrder: 'asc' }] }),
    prisma.persona.findMany({ where: { userId }, include: { figure: true }, orderBy: { updatedAt: 'desc' } }),
  ]);

  return {
    figures: figures.map((f) => ({
      kind: 'FIGURE' as const,
      id: f.id,
      personaId: null as string | null,
      figureId: f.id,
      displayName: f.name,
      dynasty: f.dynasty,
      category: f.category,
      inkColor: f.inkColor,
      sealChar: avatarMeta(f.name, f.dynasty, f.category, f.inkColor).char,
      avatarUrl: f.avatarUrl,
      avatarKind: f.avatarKind,
    })),
    personas: personas.map((p) => ({
      kind: 'PERSONA' as const,
      id: p.id,
      personaId: p.id,
      figureId: p.figureId,
      displayName: p.name,
      dynasty: p.figure.dynasty,
      category: p.figure.category,
      inkColor: p.figure.inkColor,
      sealChar: avatarMeta(p.figure.name, p.figure.dynasty, p.figure.category, p.figure.inkColor).char,
      avatarUrl: p.figure.avatarUrl,
      avatarKind: p.figure.avatarKind,
      baseName: p.figure.name,
    })),
  };
}
