/** 临时校验：确认近现代.json 合法且无残留异物 */
import fs from 'node:fs';

const raw = fs.readFileSync(new URL('../seed/figures/近现代.json', import.meta.url), 'utf8');
let list;
try {
  list = JSON.parse(raw);
} catch (e) {
  console.error('JSON 解析失败：', e.message);
  process.exit(1);
}
console.log('人物数：', list.length);

const REQUIRED = ['slug', 'name', 'courtesy', 'dynasty', 'category', 'birthYear', 'deathYear', 'birthplace', 'roles', 'biography', 'personalityTraits', 'speakingStyle', 'thoughts', 'quotes', 'anecdotes', 'expertise', 'taboos', 'sources', 'inkColor'];
const walk = (obj, path, key) => {
  if (typeof obj === 'string') {
    if (/[A-Za-z]/.test(obj) && key !== 'slug') console.log(`  [异物] ${path} = ${obj.slice(0, 60)}`);
    if (/[�]/.test(obj)) console.log(`  [乱码] ${path}`);
    return;
  }
  if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`, key));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`, k);
};

let bad = 0;
for (const f of list) {
  for (const key of REQUIRED) {
    if (f[key] === undefined) {
      console.log(`  [缺字段] ${f.slug} → ${key}`);
      bad += 1;
    }
  }
  if (f.dynasty !== '近现代') console.log(`  [朝代错] ${f.slug} → ${f.dynasty}`);
  if (f.deathYear > 1949) console.log(`  [卒年超范围] ${f.slug} → ${f.deathYear}`);
  if (f.birthYear >= f.deathYear) console.log(`  [生卒倒] ${f.slug}`);
  if (f.quotes.length < 2) console.log(`  [语录不足] ${f.slug}`);
  if (f.taboos.length < 3) console.log(`  [禁忌不足] ${f.slug}`);
  if (!/不谈|不涉/.test(f.taboos.join('|'))) console.log(`  [禁忌缺不谈/不涉] ${f.slug}`);
  walk(f, f.slug, '');
}
console.log(bad === 0 ? '必填字段齐备' : `缺 ${bad} 处必填字段`);
console.log('类别分布：', list.reduce((a, f) => ({ ...a, [f.category]: (a[f.category] ?? 0) + 1 }), {}));
console.log('朝代：', [...new Set(list.map((f) => f.dynasty))].join('、'));
console.log('名单：', list.map((f) => f.name).join('、'));
