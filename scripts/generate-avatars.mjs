/**
 * Q 版人物头像生成器（平台原创矢量绘制，不依赖外网、不涉版权）
 *
 * 按 seed/figures/*.json 中每个人物的 look 特征（冠帽、道具、须眉、表情、服色）
 * 生成一枚 200×200 的 Q 版水墨头像 → public/avatars/{slug}.svg
 * 结果写入 seed/avatars.result.json，供 prisma/seed.ts 读取。
 *
 * 用法：
 *   npm run avatars                       生成缺失的头像
 *   npm run avatars -- --force            全部重新生成
 *   npm run avatars -- --only=libai,dufu  只生成指定人物
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const figuresDir = path.join(root, 'seed', 'figures');
const looksPath = path.join(root, 'seed', 'q-looks.json');
const outDir = path.join(root, 'public', 'avatars');
const resultPath = path.join(root, 'seed', 'avatars.result.json');

const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('--all');
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1].split(',').filter(Boolean) ?? null;

/* ---------------------------------- 基础常量 --------------------------------- */

const INK = '#2E2A25';
const PAPER = '#F8F2E6';
const SKIN = '#F8DCC2';
const SKIN_SHADE = '#EFCDB0';
const HAIR = '#3A332B';

/** 朝代底色：用于背景晕染 */
const DYNASTY_COLOR = {
  先秦: '#6B5B3E',
  秦汉: '#3F3A33',
  三国两晋南北朝: '#35566B',
  隋唐: '#8A5A2B',
  宋: '#4E7A51',
  元: '#5A4A6B',
  明: '#9E3B2E',
  清: '#7A5C8A',
};

/** 类别默认造型（未单独指定 look 时套用） */
const CATEGORY_LOOK = {
  帝王: { hat: 'mian', robe: '#C8A24A', accent: '#9E3B2E', prop: 'seal' },
  文官: { hat: 'wusha', robe: '#35566B', accent: '#B8860B', prop: 'hu' },
  武将: { hat: 'helmet', robe: '#4E5866', accent: '#9E3B2E', prop: 'sword' },
  谋士: { hat: 'lun', robe: '#465C6B', accent: '#7A8C7A', prop: 'fan' },
  诗人: { hat: 'bun', robe: '#7C8B84', accent: '#9E3B2E', prop: 'book' },
  词人: { hat: 'bun', robe: '#6E7C8C', accent: '#B8860B', prop: 'scroll' },
  作家: { hat: 'bun', robe: '#5E6B63', accent: '#8A6B3A', prop: 'book' },
  思想家: { hat: 'bun', robe: '#5B5566', accent: '#6B5B3E', prop: 'slip' },
  史家: { hat: 'wusha', robe: '#5A4A3A', accent: '#B8860B', prop: 'slip' },
  其他: { hat: 'bun', robe: '#5E6B63', accent: '#35566B', prop: 'book' },
};

/* ---------------------------------- 部件绘制 --------------------------------- */

/** 冠帽：局部坐标以头顶 (100, 44) 为基准 */
function drawHat(kind, c) {
  const hair = c.hair;
  const accent = c.accent;
  switch (kind) {
    case 'mian': // 冕旒：帝王
      return `
        <rect x="70" y="38" width="60" height="24" rx="7" fill="${INK}"/>
        <rect x="60" y="28" width="80" height="12" rx="3" fill="${INK}"/>
        <g fill="#C9A227">
          ${[74, 84, 94].map((x) => `<circle cx="${x}" cy="50" r="2.6"/><circle cx="${x}" cy="62" r="2.6"/>`).join('')}
          ${[106, 116, 126].map((x) => `<circle cx="${x}" cy="50" r="2.6"/><circle cx="${x}" cy="62" r="2.6"/>`).join('')}
        </g>`;
    case 'futou': // 幞头：唐
      return `
        <path d="M62,72 C62,44 82,34 100,34 C118,34 138,44 138,72 Z" fill="${INK}"/>
        <rect x="50" y="58" width="18" height="7" rx="3.5" fill="${INK}"/>
        <rect x="132" y="58" width="18" height="7" rx="3.5" fill="${INK}"/>`;
    case 'wusha': // 长翅乌纱：宋明
      return `
        <path d="M64,72 C64,44 82,34 100,34 C118,34 136,44 136,72 Z" fill="${INK}"/>
        <rect x="28" y="54" width="38" height="7" rx="3.5" fill="${INK}"/>
        <rect x="134" y="54" width="38" height="7" rx="3.5" fill="${INK}"/>`;
    case 'lun': // 纶巾：谋士
      return `
        <path d="M58,74 C58,44 80,34 100,34 C120,34 142,44 142,74 C132,64 118,60 100,60 C82,60 68,64 58,74 Z" fill="${accent}"/>
        <path d="M60,70 C52,86 50,100 54,114" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M140,70 C148,86 150,100 146,114" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'dongpo': // 东坡巾
      return `
        <path d="M68,74 L64,30 L136,30 L132,74 Z" fill="${INK}"/>
        <rect x="76" y="38" width="48" height="20" rx="5" fill="#4A4338"/>`;
    case 'fangjin': // 明方巾：文士
      return `
        <path d="M70,72 L66,34 L134,34 L130,72 Z" fill="${accent}"/>
        <path d="M70,72 L100,52 L130,72" stroke="${INK}" stroke-opacity="0.35" stroke-width="2" fill="none"/>`;
    case 'helmet': // 兜鍪：武将
      return `
        <path d="M56,80 C56,46 78,32 100,32 C122,32 144,46 144,80 Z" fill="#5B6672"/>
        <path d="M56,80 C56,64 78,58 100,58 C122,58 144,64 144,80" fill="#6E7A86" fill-opacity="0.6"/>
        <rect x="50" y="70" width="14" height="26" rx="6" fill="#4E5866"/>
        <rect x="136" y="70" width="14" height="26" rx="6" fill="#4E5866"/>
        <circle cx="100" cy="26" r="7" fill="#9E3B2E"/>
        <path d="M100,19 C92,10 106,6 100,0" stroke="#9E3B2E" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'crown': // 先秦小冠
      return `
        <rect x="78" y="32" width="44" height="20" rx="5" fill="${INK}"/>
        <rect x="68" y="50" width="64" height="8" rx="4" fill="${INK}"/>
        <rect x="58" y="38" width="84" height="5" rx="2.5" fill="#B8860B"/>`;
    case 'bun': // 束发：文士
      return `
        <circle cx="100" cy="28" r="14" fill="${hair}"/>
        <rect x="74" y="32" width="52" height="5" rx="2.5" fill="#B8860B"/>`;
    case 'lady': // 女子高髻
      return `
        <circle cx="84" cy="32" r="13" fill="${hair}"/>
        <circle cx="116" cy="32" r="13" fill="${hair}"/>
        <circle cx="100" cy="22" r="11" fill="${hair}"/>
        <path d="M74,40 L58,32" stroke="#C9A227" stroke-width="3" stroke-linecap="round"/>
        <path d="M126,40 L142,32" stroke="#C9A227" stroke-width="3" stroke-linecap="round"/>
        <circle cx="56" cy="31" r="3" fill="#C9A227"/>
        <circle cx="144" cy="31" r="3" fill="#C9A227"/>`;
    case 'dao': // 道冠
      return `
        <path d="M78,74 L72,32 L128,32 L122,74 Z" fill="#6B5B3E"/>
        <circle cx="100" cy="24" r="7" fill="#C9A227"/>`;
    case 'hood': // 斗笠
      return `
        <path d="M36,68 C60,38 140,38 164,68 C132,58 68,58 36,68 Z" fill="#8A6B3A"/>
        <path d="M64,58 C76,44 124,44 136,58" stroke="${INK}" stroke-opacity="0.25" stroke-width="2" fill="none"/>`;
    case 'qing': // 清冠
      return `
        <path d="M64,72 C64,42 82,32 100,32 C118,32 136,42 136,72 Z" fill="${INK}"/>
        <rect x="66" y="64" width="68" height="9" rx="4" fill="#9E3B2E"/>
        <circle cx="100" cy="26" r="7" fill="#C9A227"/>
        <path d="M100,18 C96,8 104,4 100,-2" stroke="#9E3B2E" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    case 'topknot': // 布衣束髻
      return `<circle cx="100" cy="30" r="12" fill="${hair}"/><path d="M88,36 L112,36" stroke="${INK}" stroke-opacity="0.3" stroke-width="3"/>`;
    case 'none':
    default:
      return '';
  }
}

/** 眉毛：y≈72，左右对称 */
function drawBrow(kind) {
  const left = {
    calm: 'M68,72 C75,67 85,67 92,70',
    stern: 'M68,68 C76,68 86,74 93,77',
    raised: 'M68,74 C76,65 86,64 93,68',
    sad: 'M68,66 C76,70 86,76 93,79',
  }[kind] ?? 'M68,72 C75,67 85,67 92,70';
  return `
    <path d="${left}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="${left}" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(200,0) scale(-1,1)"/>`;
}

/** 眼睛：cy≈90 */
function drawEyes(kind, eyeColor) {
  const white = (rx, ry) => `<ellipse cx="82" cy="90" rx="${rx}" ry="${ry}" fill="#FFFDF7" stroke="${INK}" stroke-width="1.6"/>
    <ellipse cx="118" cy="90" rx="${rx}" ry="${ry}" fill="#FFFDF7" stroke="${INK}" stroke-width="1.6"/>`;
  const pupil = (r, dx = 0, dy = 0) => `<circle cx="${82 + dx}" cy="${90 + dy}" r="${r}" fill="${eyeColor}"/>
    <circle cx="${118 + dx}" cy="${90 + dy}" r="${r}" fill="${eyeColor}"/>
    <circle cx="${79.5 + dx}" cy="${86.5 + dy}" r="2.6" fill="#FFFDF7"/>
    <circle cx="${115.5 + dx}" cy="${86.5 + dy}" r="2.6" fill="#FFFDF7"/>`;

  switch (kind) {
    case 'gentle': // 弯月笑眼
      return `<path d="M70,90 C76,82 88,82 94,90" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M106,90 C112,82 124,82 130,90" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'stern': // 半眯、目光沉定
      return `${white(12, 11)}${pupil(6.5)}
        <path d="M70,86 C76,80 90,80 94,86" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M106,86 C112,80 126,80 130,86" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'fiery': // 睁大、神采飞扬
      return `${white(13, 16)}${pupil(7.5)}`;
    case 'sad': // 眼尾下垂
      return `${white(12, 13)}${pupil(6.5, 0, 2)}
        <path d="M70,84 C76,78 90,80 94,84" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M106,84 C112,78 126,80 130,84" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'wink': // 单眼眯
      return `<path d="M70,90 C76,82 88,82 94,90" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="118" cy="90" rx="13" ry="15" fill="#FFFDF7" stroke="${INK}" stroke-width="1.6"/>
        <circle cx="118" cy="90" r="7" fill="${eyeColor}"/><circle cx="115.5" cy="86.5" r="2.6" fill="#FFFDF7"/>`;
    case 'calm':
    default:
      return `${white(13, 15)}${pupil(7)}`;
  }
}

/** 嘴：y≈110 */
function drawMouth(kind) {
  switch (kind) {
    case 'open':
      return `<ellipse cx="100" cy="112" rx="9" ry="7" fill="#9E3B2E" fill-opacity="0.85"/>
        <path d="M91,110 C96,106 104,106 109,110" stroke="${INK}" stroke-width="1.6" fill="none"/>`;
    case 'flat':
      return `<path d="M90,112 L110,112" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    case 'frown':
      return `<path d="M88,116 C94,109 106,109 112,116" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    case 'smile':
    default:
      return `<path d="M87,108 C93,117 107,117 113,108" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
  }
}

/** 胡须 */
function drawBeard(kind, hair) {
  switch (kind) {
    case 'long': // 长髯
      return `<path d="M72,110 C68,142 82,162 100,162 C118,162 132,142 128,110 C122,124 112,132 100,132 C88,132 78,124 72,110 Z" fill="${hair}"/>
        <path d="M86,132 C92,146 108,146 114,132" stroke="${INK}" stroke-opacity="0.2" stroke-width="2" fill="none"/>`;
    case 'full': // 络腮
      return `<path d="M60,92 C58,118 74,150 100,150 C126,150 142,118 140,92 C136,116 124,138 100,138 C76,138 64,116 60,92 Z" fill="${hair}"/>`;
    case 'short':
      return `<path d="M85,116 C91,126 109,126 115,116 C109,122 91,122 85,116 Z" fill="${hair}"/>`;
    case 'goatee':
      return `<path d="M93,118 C95,136 105,136 107,118 C105,124 95,124 93,118 Z" fill="${hair}"/>`;
    case 'mustache':
      return `<path d="M84,104 C90,99 97,102 99,107" stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M116,104 C110,99 103,102 101,107" stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'none':
    default:
      return '';
  }
}

/** 道具：局部坐标 (0,0)-(40,40)，由调用方 translate 定位 */
function drawProp(kind, accent) {
  switch (kind) {
    case 'fan': // 羽扇
      return `<path d="M20,38 L6,16 C14,6 30,6 38,16 Z" fill="#F5EEDF" stroke="${INK}" stroke-width="1.8"/>
        <path d="M20,38 L12,22 M20,38 L20,18 M20,38 L30,22" stroke="${INK}" stroke-opacity="0.45" stroke-width="1.2"/>
        <rect x="18" y="34" width="5" height="6" rx="2.5" fill="#8A6B3A"/>`;
    case 'book': // 书卷
      return `<rect x="4" y="10" width="32" height="24" rx="3" fill="#F5EEDF" stroke="${INK}" stroke-width="1.8"/>
        <path d="M20,10 L20,34" stroke="${INK}" stroke-width="1.6"/>
        <path d="M8,16 L16,16 M24,16 L32,16 M8,22 L16,22 M24,22 L32,22" stroke="${INK}" stroke-opacity="0.4" stroke-width="1.2"/>`;
    case 'slip': // 竹简
      return `<g>${[4, 12, 20, 28].map((x) => `<rect x="${x}" y="4" width="6" height="32" rx="1.5" fill="#D2AC6B" stroke="${INK}" stroke-opacity="0.4" stroke-width="1"/>`).join('')}
        <rect x="2" y="12" width="36" height="3" fill="${INK}" fill-opacity="0.35"/>
        <rect x="2" y="26" width="36" height="3" fill="${INK}" fill-opacity="0.35"/></g>`;
    case 'sword': // 剑
      return `<rect x="17" y="2" width="6" height="26" fill="#CBD3D9" stroke="${INK}" stroke-width="1.2"/>
        <rect x="12" y="27" width="16" height="4" rx="2" fill="#9E3B2E"/>
        <rect x="17" y="31" width="6" height="9" rx="2" fill="#6B5B3E"/>`;
    case 'spear': // 枪矛
      return `<path d="M20,2 L27,14 L13,14 Z" fill="#CBD3D9" stroke="${INK}" stroke-width="1"/>
        <circle cx="20" cy="16" r="4" fill="#9E3B2E"/>
        <rect x="18" y="14" width="4" height="26" fill="#6B5B3E"/>`;
    case 'bow': // 弓
      return `<path d="M12,4 C30,20 30,20 12,36" stroke="#6B5B3E" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M12,4 L12,36" stroke="${INK}" stroke-width="1.6"/>
        <path d="M12,20 L26,20" stroke="${accent}" stroke-width="1.6"/>`;
    case 'brush': // 毛笔
      return `<rect x="17" y="4" width="6" height="26" rx="1.5" fill="#8A6B3A"/>
        <path d="M17,30 L23,30 L20,40 Z" fill="${INK}"/>`;
    case 'wine': // 酒壶
      return `<path d="M12,18 C12,12 28,12 28,18 L31,36 C31,40 9,40 9,36 Z" fill="#EFE7D6" stroke="${INK}" stroke-width="1.6"/>
        <rect x="15" y="8" width="10" height="7" rx="2" fill="#EFE7D6" stroke="${INK}" stroke-width="1.4"/>
        <path d="M28,20 L36,15" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'hu': // 笏板
      return `<rect x="15" y="2" width="10" height="36" rx="4" fill="#F5EEDF" stroke="${INK}" stroke-width="1.6"/>`;
    case 'seal': // 印玺
      return `<rect x="8" y="16" width="24" height="16" rx="2.5" fill="#9E3B2E"/>
        <rect x="14" y="7" width="12" height="10" rx="2.5" fill="#9E3B2E"/>
        <path d="M14,16 L26,16" stroke="#F8F2E6" stroke-opacity="0.5" stroke-width="1.4"/>`;
    case 'gourd': // 葫芦
      return `<circle cx="20" cy="12" r="7" fill="#D8B26B" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="20" cy="28" r="11" fill="#D8B26B" stroke="${INK}" stroke-width="1.4"/>
        <rect x="17" y="2" width="6" height="5" rx="2" fill="#6B5B3E"/>`;
    case 'flute': // 笛箫
      return `<rect x="2" y="17" width="36" height="6" rx="3" fill="#8A6B3A"/>
        <g fill="${INK}"><circle cx="11" cy="20" r="1.6"/><circle cx="20" cy="20" r="1.6"/><circle cx="29" cy="20" r="1.6"/></g>`;
    case 'qin': // 琴
      return `<rect x="2" y="15" width="36" height="11" rx="5" fill="#6B5B3E"/>
        <path d="M6,18 L34,18 M6,21 L34,21 M6,24 L34,24" stroke="#F5EEDF" stroke-opacity="0.6" stroke-width="1"/>`;
    case 'tea': // 茶盏
      return `<path d="M8,14 L32,14 L27,30 L13,30 Z" fill="#F5EEDF" stroke="${INK}" stroke-width="1.6"/>
        <ellipse cx="20" cy="14" rx="12" ry="3.4" fill="#EFE7D6" stroke="${INK}" stroke-width="1.2"/>
        <ellipse cx="20" cy="34" rx="11" ry="3" fill="#D8B26B"/>`;
    case 'scroll': // 画卷
      return `<rect x="6" y="13" width="28" height="15" fill="#F5EEDF" stroke="${INK}" stroke-width="1.6"/>
        <rect x="2" y="10" width="5" height="21" rx="2.5" fill="#8A6B3A"/>
        <rect x="33" y="10" width="5" height="21" rx="2.5" fill="#8A6B3A"/>
        <path d="M12,18 L26,18 M12,23 L22,23" stroke="${INK}" stroke-opacity="0.35" stroke-width="1.2"/>`;
    case 'abacus': // 算盘
      return `<rect x="3" y="10" width="34" height="20" rx="2" fill="#8A6B3A"/>
        <g fill="#F5EEDF">${[8, 15, 22, 29].map((x) => `<circle cx="${x}" cy="16" r="3"/><circle cx="${x}" cy="24" r="3"/>`).join('')}</g>`;
    case 'staff': // 节杖
      return `<rect x="18" y="10" width="4" height="30" fill="#6B5B3E"/>
        <circle cx="20" cy="7" r="6" fill="#D8B26B"/>
        <path d="M14,10 C10,16 12,22 16,26" stroke="#9E3B2E" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    case 'fan2': // 折扇
      return `<path d="M20,38 L4,18 C14,10 26,10 36,18 Z" fill="#F5EEDF" stroke="${INK}" stroke-width="1.6"/>
        <path d="M20,38 L10,20 M20,38 L20,16 M20,38 L30,20" stroke="${INK}" stroke-opacity="0.4" stroke-width="1.1"/>`;
    case 'banner': // 帅旗
      return `<rect x="17" y="6" width="4" height="34" fill="#6B5B3E"/>
        <path d="M19,8 L37,8 L37,24 L19,24 Z" fill="#9E3B2E"/>
        <path d="M23,13 L33,13 M23,18 L31,18" stroke="#F8F2E6" stroke-opacity="0.7" stroke-width="1.4"/>`;
    case 'jade': // 玉璧
      return `<circle cx="20" cy="20" r="14" fill="none" stroke="#A8C4B4" stroke-width="6"/>
        <circle cx="20" cy="20" r="5" fill="#F5EEDF"/>`;
    case 'armillary': // 浑天仪
      return `<g fill="none" stroke="#B8860B" stroke-width="2">
        <ellipse cx="20" cy="20" rx="15" ry="7"/><ellipse cx="20" cy="20" rx="7" ry="15"/>
        <ellipse cx="20" cy="20" rx="15" ry="15"/></g>
        <rect x="18" y="34" width="4" height="6" fill="#6B5B3E"/>`;
    case 'pipa': // 琵琶
      return `<path d="M20,6 C28,10 31,20 27,28 C23,35 12,35 9,27 C6,19 12,10 20,6 Z" fill="#C89B6B" stroke="${INK}" stroke-width="1.4"/>
        <rect x="18" y="2" width="5" height="7" rx="2" fill="#6B5B3E"/>
        <path d="M14,16 L14,32 M20,16 L20,32" stroke="#F5EEDF" stroke-opacity="0.7" stroke-width="1"/>`;
    case 'glasses': // 眼镜（叠加在眼部，由 drawProp 之外单独处理）
      return '';
    case 'pipe': // 烟袋
      return `<path d="M6,26 L28,14" stroke="#6B5B3E" stroke-width="4" stroke-linecap="round"/>
        <circle cx="31" cy="12" r="5.5" fill="#4A4338"/>
        <circle cx="4" cy="28" r="4.5" fill="#D8B26B"/>`;
    case 'map': // 航海图
      return `<rect x="4" y="12" width="32" height="18" rx="2" fill="#EFE7D6" stroke="${INK}" stroke-width="1.6"/>
        <path d="M8,24 C13,19 17,29 22,24 C27,19 31,27 34,24" stroke="#35566B" stroke-width="1.6" fill="none"/>
        <circle cx="12" cy="17" r="2.4" fill="#9E3B2E"/>`;
    case 'herb': // 兰草
      return `<path d="M20,38 C14,28 12,20 16,8" stroke="#6B8E5A" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M20,38 C26,30 28,22 25,12" stroke="#6B8E5A" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="16" cy="7" r="3" fill="#C9A0A8"/>`;
    case 'butterfly': // 蝶
      return `<path d="M20,20 C12,8 6,12 10,22 C13,28 18,26 20,20 Z" fill="#C9A0A8"/>
        <path d="M20,20 C28,8 34,12 30,22 C27,28 22,26 20,20 Z" fill="#D8B0B8"/>`;
    case 'tool': // 规矩
      return `<path d="M8,6 L8,34 L34,34" stroke="#6B5B3E" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M8,34 L34,6" stroke="#9E3B2E" stroke-width="2.4"/>`;
    default:
      return '';
  }
}

/* ---------------------------------- 组装头像 --------------------------------- */

function sealChar(name) {
  const last = name.split('·').filter(Boolean).pop() ?? name;
  return last.replace(/[（(].*?[)）]/g, '').slice(0, 1) || name.slice(0, 1);
}

function buildSvg(fig, look) {
  const dynastyColor = DYNASTY_COLOR[fig.dynasty] ?? '#2B2B28';
  const base = CATEGORY_LOOK[fig.category] ?? CATEGORY_LOOK.其他;
  const c = {
    hat: look.hat ?? base.hat,
    robe: look.robe ?? base.robe,
    accent: look.accent ?? base.accent,
    prop: look.prop ?? base.prop,
    beard: look.beard ?? 'none',
    brow: look.brow ?? 'calm',
    eyes: look.eyes ?? 'calm',
    mouth: look.mouth ?? 'smile',
    hair: look.hair ?? HAIR,
    skin: look.skin ?? SKIN,
    eyeColor: look.eyeColor ?? INK,
    glasses: look.glasses ?? false,
    blush: look.blush ?? true,
  };

  // 道具默认置于右下，武将类长兵器放右侧竖置
  // 长兵器竖于身侧，其余道具抱在胸前偏右；印章置左下（起首章）避免与道具相压
  const longWeapon = ['spear', 'banner', 'staff'].includes(c.prop);
  const propTransform = longWeapon ? 'translate(140,96) rotate(14) scale(0.9)' : 'translate(126,142) rotate(-8) scale(0.85)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${fig.name}头像">
  <defs>
    <clipPath id="c"><circle cx="100" cy="100" r="98"/></clipPath>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#FFFDF7"/>
      <stop offset="100%" stop-color="${dynastyColor}" stop-opacity="0.22"/>
    </radialGradient>
    <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c.robe}"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0.58"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#c)">
    <circle cx="100" cy="100" r="98" fill="url(#bg)"/>
    <g fill="${dynastyColor}" fill-opacity="0.1">
      <circle cx="44" cy="52" r="16"/><circle cx="160" cy="70" r="11"/><circle cx="150" cy="30" r="6"/>
    </g>
    <path d="M-2,150 C30,132 62,158 96,146 C130,134 168,152 202,140 L202,202 L-2,202 Z" fill="${dynastyColor}" fill-opacity="0.1"/>
    <path d="M-2,168 C34,156 70,176 104,166 C138,156 170,174 202,164 L202,202 L-2,202 Z" fill="${dynastyColor}" fill-opacity="0.14"/>

    <!-- 身体与袍服 -->
    <path d="M50,204 C52,162 74,140 100,140 C126,140 148,162 150,204 Z" fill="url(#robe)"/>
    <path d="M84,146 L100,170 L116,146" stroke="${c.accent}" stroke-width="6" fill="none" stroke-linejoin="round"/>
    <path d="M84,146 L100,170 L116,146" stroke="#F5EEDF" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
    <rect x="62" y="180" width="76" height="10" rx="4" fill="${c.accent}"/>
    <circle cx="60" cy="176" r="10" fill="${c.skin}"/>
    <circle cx="140" cy="176" r="10" fill="${c.skin}"/>

    <!-- 道具 -->
    <g transform="${propTransform}">${drawProp(c.prop, c.accent)}</g>

    <!-- 颈与头 -->
    <rect x="88" y="116" width="24" height="28" rx="9" fill="${c.skin}"/>
    <ellipse cx="57" cy="98" rx="9" ry="11" fill="${c.skin}" stroke="${INK}" stroke-width="1.6"/>
    <ellipse cx="143" cy="98" rx="9" ry="11" fill="${c.skin}" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="100" cy="90" r="45" fill="${c.skin}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M56,88 C58,50 80,40 100,40 C120,40 142,50 144,88 C144,72 130,62 100,62 C70,62 56,72 56,88 Z" fill="${c.hair}"/>
    ${drawHat(c.hat, c)}
    ${drawBrow(c.brow)}
    ${drawEyes(c.eyes, c.eyeColor)}
    <path d="M97,102 C99,106 101,106 103,102" stroke="${INK}" stroke-opacity="0.6" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${drawMouth(c.mouth)}
    ${c.blush ? `<g fill="#9E3B2E" fill-opacity="0.18"><ellipse cx="68" cy="104" rx="8" ry="5"/><ellipse cx="132" cy="104" rx="8" ry="5"/></g>` : ''}
    ${drawBeard(c.beard, c.hair)}
    ${c.glasses ? `<g fill="none" stroke="#4A4338" stroke-width="2"><circle cx="82" cy="90" r="15"/><circle cx="118" cy="90" r="15"/><path d="M97,90 L103,90"/></g>` : ''}

    <!-- 印章 -->
    <g>
      <rect x="24" y="128" width="26" height="26" rx="4" fill="#9E3B2E"/>
      <text x="37" y="141" text-anchor="middle" dominant-baseline="central"
        font-size="15" font-family='"Noto Serif SC","Songti SC",serif' fill="#FFFDF7">${sealChar(fig.name)}</text>
    </g>
  </g>
  <circle cx="100" cy="100" r="98" fill="none" stroke="${dynastyColor}" stroke-width="4"/>
  <circle cx="100" cy="100" r="92" fill="none" stroke="${dynastyColor}" stroke-opacity="0.35" stroke-width="1.2"/>
</svg>
`;
}

/* ------------------------------------ 主流程 ---------------------------------- */

async function main() {
  const files = (await fs.readdir(figuresDir)).filter((f) => f.endsWith('.json'));
  const figures = [];
  for (const file of files) {
    const list = JSON.parse(await fs.readFile(path.join(figuresDir, file), 'utf8'));
    figures.push(...list);
  }

  let looks = {};
  try {
    looks = JSON.parse(await fs.readFile(looksPath, 'utf8'));
  } catch {
    looks = {};
  }

  let results = {};
  try {
    results = JSON.parse(await fs.readFile(resultPath, 'utf8'));
  } catch {
    results = {};
  }

  await fs.mkdir(outDir, { recursive: true });

  let created = 0;
  let skipped = 0;
  for (const fig of figures) {
    if (only && !only.includes(fig.slug)) continue;
    if (!force && results[fig.slug]?.ok) {
      skipped += 1;
      continue;
    }
    const svg = buildSvg(fig, looks[fig.slug] ?? {});
    await fs.writeFile(path.join(outDir, `${fig.slug}.svg`), svg, 'utf8');
    results[fig.slug] = {
      ok: true,
      url: `/avatars/${fig.slug}.svg`,
      source: `平台原创 Q 版水墨绘制（${fig.dynasty}·${fig.category}）`,
    };
    created += 1;
  }

  await fs.writeFile(resultPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  console.log(`Q 版头像：新生成 ${created} 枚，跳过 ${skipped} 枚，共 ${Object.keys(results).length} 枚 → public/avatars/`);
  console.log('调整造型请改 seed/q-looks.json（hat/robe/accent/prop/beard/brow/eyes/mouth），再跑 npm run avatars -- --force。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
