'use client';

import { cn } from '@/lib/utils';

interface InkSealProps {
  /** 印文，一般取姓氏或单字 */
  char: string;
  /** 印章主色（朱砂 / 靛青 / 朝代色） */
  color?: string;
  size?: number;
  className?: string;
  title?: string;
}

/** 朱文印章：方形双线边框 + 印文，用于人物标识与落款 */
export function InkSeal({ char, color = '#9E3B2E', size = 44, className, title }: InkSealProps) {
  return (
    <span
      title={title}
      className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}
      style={{
        width: size,
        height: size,
        color,
        border: `2px solid ${color}`,
        borderRadius: 3,
        background: `linear-gradient(145deg, ${color}14, ${color}05)`,
        fontFamily: 'var(--font-serif, "Noto Serif SC", "Songti SC", serif)',
        fontSize: size * 0.46,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: `0 1px 0 rgba(255,255,255,.6) inset, 0 2px 6px ${color}33`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-[3px] border opacity-45"
        style={{ borderColor: color, borderRadius: 1 }}
      />
      <span className="relative">{char.slice(0, 2)}</span>
    </span>
  );
}
