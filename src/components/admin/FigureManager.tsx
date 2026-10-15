'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Link2, RotateCcw } from 'lucide-react';
import { FigureAvatar } from '@/components/figures/FigureAvatar';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { clearFigureAvatar, setFigureAvatarFromFile, setFigureAvatarFromUrl, toggleFigure } from '@/lib/actions/admin';
import { cn } from '@/lib/utils';

export interface ManageableFigure {
  id: string;
  name: string;
  dynasty: string;
  category: string;
  inkColor: string;
  enabled: boolean;
  avatarKind: string;
  avatarUrl: string | null;
  avatarSource: string | null;
}

export function FigureManager({ figures }: { figures: ManageableFigure[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const filtered = figures.filter(
    (f) =>
      !keyword.trim() ||
      f.name.includes(keyword.trim()) ||
      f.dynasty.includes(keyword.trim()) ||
      f.category.includes(keyword.trim()),
  );

  const onToggle = (figure: ManageableFigure) => {
    startTransition(async () => {
      await toggleFigure(figure.id, !figure.enabled);
      router.refresh();
    });
  };

  const applyUrl = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await setFigureAvatarFromUrl(id, url);
      if (!result.ok) setMessage({ tone: 'err', text: result.error ?? '设置失败' });
      else {
        setMessage({ tone: 'ok', text: '头像已更新' });
        setUrl('');
      }
      router.refresh();
    });
  };

  const upload = (id: string, file: File) => {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('figureId', id);
      formData.set('file', file);
      const result = await setFigureAvatarFromFile(formData);
      setMessage(
        result.ok ? { tone: 'ok', text: '头像已上传' } : { tone: 'err', text: result.error ?? '上传失败' },
      );
      router.refresh();
    });
  };

  const reset = (id: string) => {
    startTransition(async () => {
      await clearFigureAvatar(id);
      router.refresh();
    });
  };

  return (
    <ScrollCard className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-base font-bold text-ink">内置人物</h2>
        <span className="text-xs text-ink-mute">
          启停仅控制是否出现在选角面板，档案内容不可修改
        </span>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="检索人物"
          className="ink-input ml-auto h-8 w-36 py-1 text-xs"
        />
      </div>

      {message ? (
        <p
          className={cn(
            'mb-3 rounded-sm px-3 py-2 text-xs',
            message.tone === 'ok' ? 'bg-moss/10 text-moss' : 'bg-cinnabar/10 text-cinnabar',
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className="thin-scrollbar max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((figure) => (
          <div key={figure.id} className="rounded-sm border border-paper-line bg-white/50">
            <div className="flex items-center gap-3 p-2.5">
              <FigureAvatar
                name={figure.name}
                dynasty={figure.dynasty}
                category={figure.category}
                inkColor={figure.inkColor}
                avatarUrl={figure.avatarUrl}
                avatarKind={figure.avatarKind}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{figure.name}</p>
                <p className="truncate text-[11px] text-ink-mute">
                  {figure.dynasty} · {figure.category} ·{' '}
                  {figure.avatarKind === 'IMAGE' ? '古画像' : '默认头像'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(openId === figure.id ? null : figure.id)}
                className="rounded-sm border border-paper-line px-2 py-1 text-[11px] text-ink-mute hover:border-cinnabar/50 hover:text-cinnabar"
              >
                头像
              </button>
              <button
                type="button"
                onClick={() => onToggle(figure)}
                disabled={pending}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  figure.enabled ? 'bg-moss/70' : 'bg-ink/20',
                )}
                title={figure.enabled ? '点击停用' : '点击启用'}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                    figure.enabled ? 'left-[18px]' : 'left-0.5',
                  )}
                />
              </button>
            </div>

            {openId === figure.id ? (
              <div className="border-t border-paper-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="粘贴公有领域画像地址 http(s)://…"
                    className="ink-input h-8 flex-1 py-1 text-xs"
                  />
                  <button type="button" onClick={() => applyUrl(figure.id)} disabled={pending} className="ink-btn-ghost px-2.5 py-1 text-xs">
                    <Link2 size={12} /> 抓取
                  </button>
                  <label className="ink-btn-ghost cursor-pointer px-2.5 py-1 text-xs">
                    <ImagePlus size={12} /> 上传
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(figure.id, file);
                      }}
                    />
                  </label>
                  {figure.avatarKind === 'IMAGE' ? (
                    <button type="button" onClick={() => reset(figure.id)} disabled={pending} className="ink-btn-ghost px-2.5 py-1 text-xs">
                      <RotateCcw size={12} /> 还原
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-ink/50">
                  {figure.avatarSource
                    ? `当前来源：${figure.avatarSource}`
                    : '尚无画像，使用程序生成的水墨印章头像。建议只用公有领域古画像，勿用游戏立绘。'}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-ink/50">
        亦可在本机运行 <code className="rounded bg-paper-deep px-1">npm run fetch:avatars</code>{' '}
        批量抓取 seed/avatars.json 中列出的古画像。
      </p>
    </ScrollCard>
  );
}
