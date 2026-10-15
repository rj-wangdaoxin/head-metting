import { CATEGORY_SYMBOL, DYNASTY_COLOR } from '@/lib/constants';

export interface AvatarMeta {
  /** 印文：姓名末段的第一个字（如「爱新觉罗·玄烨」取「玄」） */
  char: string;
  /** 类型符号 */
  symbol: string;
  /** 朝代墨色 */
  color: string;
}

export function sealCharOf(name: string) {
  const parts = name.split('·').filter(Boolean);
  const last = parts[parts.length - 1] ?? name;
  return last.replace(/[（(].*?[)）]/g, '').slice(0, 1) || name.slice(0, 1);
}

export function avatarMeta(name: string, dynasty: string, category: string, inkColor?: string): AvatarMeta {
  return {
    char: sealCharOf(name),
    symbol: CATEGORY_SYMBOL[category] ?? '墨',
    color: inkColor || DYNASTY_COLOR[dynasty] || '#2B2B28',
  };
}

/** 判断头像是否可用（存在实际图片：Q 版绘制或外链图片） */
export function hasImageAvatar(avatarUrl?: string | null, avatarKind?: string | null) {
  return Boolean(avatarUrl) && (avatarKind === 'QVER' || avatarKind === 'IMAGE');
}
