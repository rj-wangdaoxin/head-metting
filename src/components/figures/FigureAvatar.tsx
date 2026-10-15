'use client';

import { useState } from 'react';
import { avatarMeta, hasImageAvatar } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface FigureAvatarProps {
  name: string;
  dynasty: string;
  category: string;
  inkColor?: string;
  avatarUrl?: string | null;
  avatarKind?: string | null;
  size?: number;
  className?: string;
}

/** 人物头像：优先 Q 版绘制像，加载失败时自动回退程序化水墨印章头像 */
export function FigureAvatar({
  name,
  dynasty,
  category,
  inkColor,
  avatarUrl,
  avatarKind,
  size = 64,
  className,
}: FigureAvatarProps) {
  const [broken, setBroken] = useState(false);
  const meta = avatarMeta(name, dynasty, category, inkColor);
  const showImage = hasImageAvatar(avatarUrl, avatarKind) && !broken;

  if (showImage) {
    return (
      <img
        src={avatarUrl as string}
        alt={name}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-full border bg-[#F8F2E6]', className)}
        style={{ width: size, height: size, borderColor: `${meta.color}66` }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${name}头像`}
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id={`av-${meta.char}-${meta.symbol}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor={meta.color} stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="99" height="99" rx="4" fill={`url(#av-${meta.char}-${meta.symbol})`} />
      <rect x="0.5" y="0.5" width="99" height="99" rx="4" fill="none" stroke={meta.color} strokeWidth="2.5" />
      <rect x="7" y="7" width="86" height="86" rx="2" fill="none" stroke={meta.color} strokeWidth="0.8" strokeOpacity="0.45" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="46"
        fontWeight="700"
        fill={meta.color}
        style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
      >
        {meta.char}
      </text>
      <text
        x="50"
        y="82"
        textAnchor="middle"
        fontSize="11"
        fill={meta.color}
        fillOpacity="0.75"
        style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
      >
        {dynasty.slice(0, 4)}
      </text>
      <circle cx="82" cy="18" r="11" fill="#9E3B2E" fillOpacity="0.9" />
      <text
        x="82"
        y="19"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fill="#FFFDF7"
        style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
      >
        {meta.symbol}
      </text>
    </svg>
  );
}
