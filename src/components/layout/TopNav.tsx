'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '@/lib/actions/auth';
import type { CurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/figures', label: '人物库' },
  { href: '/personas', label: '分身' },
  { href: '/debate', label: '论辩' },
  { href: '/debate/history', label: '辩录' },
  { href: '/admin', label: '后台' },
];

export function TopNav({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const isActive = (href: string) =>
    href === '/debate' ? pathname === '/debate' || /^\/debate\/[^h]/.test(pathname) : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-paper-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1400px] items-center gap-6 px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center border-2 border-cinnabar font-serif text-base font-bold text-cinnabar transition-transform duration-300 group-hover:rotate-[-6deg]"
            style={{ borderRadius: 3, boxShadow: '0 2px 6px rgba(158,59,46,.22)' }}
          >
            史
          </span>
          <span className="font-serif text-lg font-bold tracking-[0.12em] text-ink">青史群贤</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative px-3 py-1.5 text-sm transition-colors duration-200',
                isActive(item.href) ? 'font-medium text-cinnabar' : 'text-ink-mute hover:text-ink',
              )}
            >
              {item.label}
              {isActive(item.href) ? (
                <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left animate-line-grow bg-cinnabar/70" />
              ) : null}
            </Link>
          ))}
        </nav>

        {user ? (
          <div ref={menuRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-sm border border-paper-line bg-white/60 px-2.5 py-1.5 transition-all duration-200 hover:border-ink/30"
            >
              <span
                className="flex h-6 w-6 items-center justify-center border font-serif text-xs font-bold"
                style={{ borderColor: '#9E3B2E', color: '#9E3B2E', borderRadius: 2 }}
              >
                {user.name.slice(0, 1)}
              </span>
              <span className="max-w-[120px] truncate text-xs text-ink">{user.name}</span>
            </button>

            {open ? (
              <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-sm border border-paper-line bg-paper-card shadow-scroll">
                <div className="border-b border-paper-line px-3 py-2 text-[11px] text-ink-mute">
                  当前账号 · {user.name}
                </div>
                <Link
                  href="/admin#account"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-xs text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  我的账号与口令
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-xs text-ink-mute transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  切换账号
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full px-3 py-2 text-left text-xs text-cinnabar transition-colors hover:bg-paper-deep"
                  >
                    登出
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
