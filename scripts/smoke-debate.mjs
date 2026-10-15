/** 临时冒烟：用本地模拟的 OpenAI 兼容服务跑通「开辩 → 轮次 → 结辩 → 辩要/评点 → 导出」全流程 */
import http from 'node:http';
import { PrismaClient } from '@prisma/client';

const PORT = 4010;
const BASE = `http://127.0.0.1:${PORT}/v1`;
const APP = 'http://127.0.0.1:3000';

const server = http.createServer((req, res) => {
  if (!req.url.includes('/chat/completions')) {
    res.writeHead(404);
    res.end();
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const parsed = JSON.parse(body || '{}');
    const sys = parsed.messages?.[0]?.content ?? '';
    let content;
    if (sys.includes('记室')) content = '【辩要】三家各执一端，德刑之辩未有定论，然皆本于安民。';
    else if (sys.includes('判官')) content = '【评点】韩非举证最密，孔子持论最正，二者各得其所长。';
    else content = '吾观此事，当循其本。对方所言虽有可取，然未察时势之变，故不敢苟同。';

    if (parsed.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const chunks = content.match(/.{1,5}/g) ?? [content];
      for (const c of chunks) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    }
  });
});

await new Promise((r) => server.listen(PORT, r));

const prisma = new PrismaClient();
const setting = (key, value) =>
  prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });

// 先备份本机真实的模型配置，收尾务必还原
const LLM_KEYS = ['llm.baseUrl', 'llm.apiKey', 'llm.model', 'llm.temperature', 'llm.maxTokens', 'llm.timeoutMs'];
const backup = Object.fromEntries(
  (await prisma.setting.findMany({ where: { key: { in: LLM_KEYS } } })).map((s) => [s.key, s.value]),
);
const restore = async () => {
  for (const key of LLM_KEYS) await setting(key, backup[key] ?? '');
};

await setting('llm.baseUrl', BASE);
await setting('llm.apiKey', 'test-key');
await setting('llm.model', 'mock-model');
await setting('llm.timeoutMs', '20000');

const figures = await prisma.figure.findMany({ where: { name: { in: ['孔子', '韩非'] } } });
if (figures.length < 2) {
  console.error('缺少测试人物');
  process.exit(1);
}

const session = await prisma.debateSession.create({
  data: {
    topic: '治国当以德化，还是以法度？',
    roundLimit: 1,
    allowJudgment: true,
    participants: {
      create: figures.map((f, i) => ({
        kind: 'FIGURE',
        figureId: f.id,
        displayName: f.name,
        dynastyLabel: f.dynasty,
        categoryLabel: f.category,
        inkColor: f.inkColor,
        sealChar: f.name[0],
        orderIndex: i,
      })),
    },
  },
});
console.log('会话已建：', session.id);

async function turn() {
  const res = await fetch(`${APP}/api/debate/${session.id}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: { type: 'NEXT_ROUND' } }),
  });
  if (!res.ok) {
    console.error('turn 失败', res.status, await res.text());
    return null;
  }
  const text = await res.text();
  const events = text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const line = block.split('\n').find((l) => l.startsWith('data:'));
      return line ? JSON.parse(line.slice(5).trim()) : null;
    })
    .filter(Boolean);
  const deltas = events.filter((e) => e.type === 'delta').length;
  const metas = events.filter((e) => e.type === 'meta');
  console.log(`  · 本次推进 ${metas.length} 位：${metas.map((m) => `${m.speakerName}[第${m.round}轮${m.phase === 'CLOSING' ? '·结辩' : ''}]`).join(' → ') || '无'}`);
  console.log(`    delta ${deltas} 段`);
  const done = events.find((e) => e.type === 'done');
  return done;
}

for (let i = 0; i < 4; i += 1) {
  const done = await turn();
  if (done?.ended) break;
}

const final = await prisma.debateSession.findUnique({
  where: { id: session.id },
  include: { messages: true },
});
console.log('阶段：', final.phase, final.status, '发言条数：', final.messages.length);
console.log('辩要：', final.summary?.slice(0, 40) ?? '（无）');
console.log('评点：', final.judgment?.slice(0, 40) ?? '（无）');

const exported = await fetch(`${APP}/api/debate/${session.id}/export`);
const markdown = await exported.text();
console.log('导出字节数：', markdown.length, '| 首行：', markdown.split('\n')[0]);

const extended = await fetch(`${APP}/api/debate/${session.id}/extend`, { method: 'POST' });
console.log('续场：', JSON.stringify(await extended.json()));

await prisma.debateSession.delete({ where: { id: session.id } });
await restore();
const restored = Object.fromEntries(
  (await prisma.setting.findMany({ where: { key: { in: LLM_KEYS } } })).map((s) => [s.key, s.value]),
);
console.log('模型配置已还原：', JSON.stringify(restored));
await prisma.$disconnect();
server.close();
console.log('冒烟完成，测试数据已清理。');
