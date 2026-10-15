import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'seed', 'figures');

const DYNASTIES = ['先秦', '秦汉', '三国两晋南北朝', '隋唐', '宋', '元', '明', '清', '近现代'];
const CATEGORIES = ['帝王', '文官', '武将', '谋士', '诗人', '词人', '作家', '思想家', '史家', '其他'];

const FigureSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug 仅允许小写字母、数字与连字符'),
  name: z.string().min(1),
  courtesy: z.string().optional(),
  dynasty: z.enum(DYNASTIES),
  category: z.enum(CATEGORIES),
  birthYear: z.number().int().nullable(),
  deathYear: z.number().int().nullable(),
  birthplace: z.string().nullable().optional(),
  roles: z.array(z.string()).min(1),
  biography: z.string().min(60, '生平过短，需 ≥60 字'),
  personalityTraits: z.array(z.string()).min(3),
  speakingStyle: z.object({
    selfAddress: z.string().min(1),
    tone: z.string().min(10),
    catchphrases: z.array(z.string()).min(2),
  }),
  thoughts: z.string().min(20),
  quotes: z.array(z.object({ text: z.string().min(4), source: z.string().min(2) })).min(2),
  anecdotes: z.array(z.string()).min(1),
  expertise: z.array(z.string()).min(3),
  taboos: z.array(z.string()).min(3),
  sources: z.array(z.string()).min(2),
});

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const slugs = new Set();
let total = 0;
let failed = 0;

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  for (const item of raw) {
    total += 1;
    const result = FigureSchema.safeParse(item);
    if (!result.success) {
      failed += 1;
      console.error(`\n[错误] ${file} → ${item.slug ?? item.name}`);
      for (const issue of result.error.issues) {
        console.error(`  · ${issue.path.join('.')}: ${issue.message}`);
      }
      continue;
    }
    if (slugs.has(item.slug)) {
      failed += 1;
      console.error(`\n[错误] ${file} → slug 重复：${item.slug}`);
    }
    slugs.add(item.slug);

    if (item.birthYear && item.deathYear && item.birthYear > item.deathYear) {
      failed += 1;
      console.error(`\n[错误] ${item.slug}：生卒年颠倒`);
    }
    if (!item.taboos.some((t) => t.includes('不谈') || t.includes('不涉'))) {
      console.warn(`[提示] ${item.slug}：禁忌条目建议包含「不谈/不涉」后世内容`);
    }
  }
}

console.log(`\n共校验 ${total} 位人物，失败 ${failed} 项，覆盖 ${files.length} 个朝代文件。`);
const byDynasty = {};
for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  for (const item of raw) byDynasty[item.dynasty] = (byDynasty[item.dynasty] ?? 0) + 1;
}
console.log('朝代分布：', byDynasty);
process.exit(failed > 0 ? 1 : 0);
