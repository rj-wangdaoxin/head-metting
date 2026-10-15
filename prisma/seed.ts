import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { DYNASTY_COLOR, DYNASTY_ORDER } from '../src/lib/constants';

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const figuresDir = path.join(root, 'seed', 'figures');
const avatarResultPath = path.join(root, 'seed', 'avatars.result.json');

interface RawFigure {
  slug: string;
  name: string;
  courtesy?: string | null;
  dynasty: string;
  category: string;
  birthYear?: number | null;
  deathYear?: number | null;
  birthplace?: string | null;
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
  inkColor?: string;
}

const j = (v: unknown) => JSON.stringify(v ?? []);

function readFigures(): RawFigure[] {
  const files = fs.readdirSync(figuresDir).filter((f) => f.endsWith('.json'));
  const list: RawFigure[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(figuresDir, file), 'utf8')) as RawFigure[];
    list.push(...raw);
  }
  return list;
}

function readAvatarResults(): Record<string, { ok: boolean; url?: string; source?: string }> {
  if (!fs.existsSync(avatarResultPath)) return {};
  return JSON.parse(fs.readFileSync(avatarResultPath, 'utf8'));
}

async function main() {
  const figures = readFigures();
  const avatars = readAvatarResults();

  for (const raw of figures) {
    const avatar = avatars[raw.slug];
    const data = {
      name: raw.name,
      courtesy: raw.courtesy ?? null,
      dynasty: raw.dynasty,
      dynastyOrder: DYNASTY_ORDER[raw.dynasty] ?? 99,
      category: raw.category,
      birthYear: raw.birthYear ?? null,
      deathYear: raw.deathYear ?? null,
      birthplace: raw.birthplace ?? null,
      roles: j(raw.roles),
      biography: raw.biography,
      personalityTraits: j(raw.personalityTraits),
      speakingStyle: j(raw.speakingStyle),
      thoughts: raw.thoughts,
      quotes: j(raw.quotes),
      anecdotes: j(raw.anecdotes),
      expertise: j(raw.expertise),
      taboos: j(raw.taboos),
      sources: j(raw.sources),
      inkColor: raw.inkColor ?? DYNASTY_COLOR[raw.dynasty] ?? '#2B2B28',
      avatarUrl: avatar?.ok ? avatar.url ?? null : null,
      avatarKind: avatar?.ok ? 'QVER' : 'DEFAULT',
      avatarSource: avatar?.ok ? avatar.source ?? null : null,
    };

    await prisma.figure.upsert({
      where: { slug: raw.slug },
      create: { slug: raw.slug, ...data },
      update: data,
    });
  }

  console.log(`已导入/更新 ${figures.length} 位人物本体；头像命中 ${Object.values(avatars).filter((a) => a.ok).length} 张。`);
  console.log('模型与辩论配置现归各账号私有，由账号在后台自行配置，种子阶段不再写入。');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
