/**
 * 多用户迁移：把「无用户」时期的既有数据迁到一个默认账号下。
 *
 *   npx tsx scripts/migrate-users.ts export   # 1) 先导出（此时 schema 尚未变更）
 *   npx prisma db push --accept-data-loss     # 2) 重建表结构
 *   npm run db:seed                           # 3) 重灌内置人物
 *   npx tsx scripts/migrate-users.ts import   # 4) 再导入，数据挂到默认账号
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const BACKUP = path.join(process.cwd(), 'prisma', '.migrate-backup.json');
const DEFAULT_USER_NAME = '主人';
const DEFAULT_PASSWORD = 'headmetting';

const prisma = new PrismaClient();

function reviveDates(_key: string, value: unknown) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return new Date(value);
  return value;
}

async function stageExport() {
  const [figures, personas, sessions, participants, messages, settings] = await Promise.all([
    prisma.figure.findMany({
      select: { id: true, slug: true, enabled: true, avatarUrl: true, avatarKind: true, avatarSource: true },
    }),
    prisma.persona.findMany({ include: { figure: { select: { slug: true } } } }),
    prisma.debateSession.findMany(),
    prisma.debateParticipant.findMany(),
    prisma.message.findMany(),
    prisma.setting.findMany({ select: { key: true, value: true } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    figures,
    personas: personas.map(({ figure, ...rest }) => ({ ...rest, figureSlug: figure.slug })),
    sessions,
    participants,
    messages,
    settings,
  };

  await fs.writeFile(BACKUP, JSON.stringify(payload, null, 2), 'utf8');
  console.log(
    `已导出：人物 ${figures.length} / 分身 ${personas.length} / 辩录 ${sessions.length} / 发言 ${messages.length} / 配置 ${settings.length}`,
  );
  console.log(`备份文件：${BACKUP}`);
}

async function stageImport() {
  const raw = await fs.readFile(BACKUP, 'utf8');
  const data = JSON.parse(raw, reviveDates) as {
    figures: { id: string; slug: string; enabled: boolean; avatarUrl: string | null; avatarKind: string; avatarSource: string | null }[];
    personas: Record<string, unknown>[];
    sessions: Record<string, unknown>[];
    participants: Record<string, unknown>[];
    messages: Record<string, unknown>[];
    settings: { key: string; value: string }[];
  };

  const { salt, hash } = hashPassword(DEFAULT_PASSWORD);
  const user = await prisma.user.upsert({
    where: { name: DEFAULT_USER_NAME },
    update: {},
    create: { name: DEFAULT_USER_NAME, salt, passwordHash: hash },
  });
  console.log(`默认账号：${user.name}（初始口令 ${DEFAULT_PASSWORD}，登录后请在「我的账号」修改）`);

  // 重建表后 Figure.id 会变，建立「旧 id → 新 id」映射供辩录的弱引用重指
  const figureIdMap = new Map<string, string>();
  for (const f of data.figures) {
    const updated = await prisma.figure
      .update({
        where: { slug: f.slug },
        data: { enabled: f.enabled, avatarUrl: f.avatarUrl, avatarKind: f.avatarKind, avatarSource: f.avatarSource },
      })
      .catch(() => null);
    if (updated) figureIdMap.set(f.id, updated.id);
  }

  for (const p of data.personas) {
    const { figureSlug, ...rest } = p as Record<string, unknown> & { figureSlug: string };
    const figure = await prisma.figure.findUnique({ where: { slug: figureSlug }, select: { id: true } });
    if (!figure) {
      console.log(`  跳过分身：本体 ${figureSlug} 已不存在`);
      continue;
    }
    await prisma.persona
      .create({
        data: {
          ...(rest as unknown as Prisma.PersonaUncheckedCreateInput),
          figureId: figure.id,
          userId: user.id,
        },
      })
      .catch(() => null);
  }

  for (const s of data.sessions) {
    await prisma.debateSession
      .create({
        data: { ...(s as unknown as Prisma.DebateSessionUncheckedCreateInput), userId: user.id },
      })
      .catch(() => null);
  }
  for (const p of data.participants) {
    const row = p as Record<string, unknown> & { figureId: string };
    await prisma.debateParticipant
      .create({
        data: {
          ...(row as unknown as Prisma.DebateParticipantUncheckedCreateInput),
          figureId: figureIdMap.get(row.figureId) ?? row.figureId,
        },
      })
      .catch(() => null);
  }
  for (const m of data.messages) {
    await prisma.message
      .create({ data: m as unknown as Prisma.MessageUncheckedCreateInput })
      .catch(() => null);
  }
  for (const s of data.settings) {
    await prisma.setting
      .upsert({ where: { userId_key: { userId: user.id, key: s.key } }, create: { userId: user.id, ...s }, update: { value: s.value } })
      .catch(() => null);
  }

  const counts = {
    分身: await prisma.persona.count({ where: { userId: user.id } }),
    辩录: await prisma.debateSession.count({ where: { userId: user.id } }),
    发言: await prisma.message.count({ where: { session: { userId: user.id } } }),
    配置: await prisma.setting.count({ where: { userId: user.id } }),
  };
  console.log('导入完成 →', counts);
}

async function main() {
  const stage = process.argv[2];
  if (stage === 'export') {
    await stageExport();
  } else if (stage === 'import') {
    await stageImport();
  } else {
    console.log('用法：npx tsx scripts/migrate-users.ts export | import');
  }
  await prisma.$disconnect();
}

main();
