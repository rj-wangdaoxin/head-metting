'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { changePasswordAction, logoutAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

export function AccountPanel({ name, userNames }: { name: string; userNames: string[] }) {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const result = await changePasswordAction({ oldPassword, newPassword, confirm });
    setBusy(false);

    if (!result.ok) {
      setMsg({ ok: false, text: result.error });
      return;
    }
    setMsg({ ok: true, text: '口令已改，下次入座即用新口令' });
    setOld('');
    setNew('');
    setConfirm('');
  }

  const others = userNames.filter((n) => n !== name);

  return (
    <div id="account" className="scroll-mt-20">
      <ScrollCard className="p-5">
        <h2 className="mb-1 font-serif text-base font-bold text-ink">我的账号</h2>
        <p className="mb-4 text-xs text-ink-mute">
          当前：<span className="font-medium text-ink">{name}</span>
          　·　本机另有账号：{others.length > 0 ? others.join('、') : '暂无'}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="old-password" className="ink-label mb-1.5 block">
              原口令
            </label>
            <input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOld(e.target.value)}
              autoComplete="current-password"
              className="ink-input"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="ink-label mb-1.5 block">
              新口令
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
              autoComplete="new-password"
              placeholder="至少六位"
              className="ink-input"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="ink-label mb-1.5 block">
              再输一遍
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="ink-input"
            />
          </div>
        </div>

        {msg ? (
          <p className={cn('mt-3 text-xs', msg.ok ? 'text-moss' : 'text-cinnabar')}>{msg.text}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="ink-btn ink-btn-primary disabled:opacity-60"
          >
            {busy ? '请稍候……' : '修改口令'}
          </button>
          <Link href="/login" className="ink-btn ink-btn-ghost">
            切换 / 新建账号
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="ink-btn ink-btn-ghost">
              登出
            </button>
          </form>
        </div>

        <p className="mt-4 border-t border-paper-line pt-3 text-[11px] leading-5 text-ink/50">
          分身、辩录、模型密钥与辩论配额皆随账号各自隔离，彼此互不可见；内置人物档案与其启停为全站共用，不受账号切换影响。
        </p>
      </ScrollCard>
    </div>
  );
}
