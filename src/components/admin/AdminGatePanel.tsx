'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { lockAdminAction, unlockAdminAction } from '@/lib/actions/admin';

/** 后台上锁时的解锁屏：部署到公网后由 ADMIN_PASSWORD 环境变量启用 */
export function AdminGatePanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await unlockAdminAction({ password });
      if (!result.ok) {
        setError(result.error ?? '解锁失败');
        return;
      }
      setPassword('');
      router.refresh();
    });
  };

  return (
    <ScrollCard className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck size={18} className="text-cinnabar" />
        <h1 className="font-serif text-xl font-bold tracking-wide text-ink">后台已上锁</h1>
      </div>
      <p className="text-sm leading-6 text-ink-mute">
        此站已开放注册，后台可改动模型密钥与人物启停，故以口令护之。输入管理口令后方可进入。
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block">
          <span className="ink-label">管理口令</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入管理口令"
            className="ink-input mt-2"
            autoFocus
          />
        </label>

        {error ? <p className="rounded-sm bg-cinnabar/10 px-3 py-2 text-sm text-cinnabar">{error}</p> : null}

        <button type="submit" disabled={pending} className="ink-btn-seal w-full disabled:opacity-50">
          {pending ? '校验中……' : '解锁进入'}
        </button>
      </form>
    </ScrollCard>
  );
}

/** 后台页眉的「立即上锁」按钮：公用电脑上用完即锁 */
export function AdminLockButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const lock = () => {
    startTransition(async () => {
      await lockAdminAction();
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={lock}
      disabled={pending}
      className="ink-btn-ghost disabled:opacity-50"
      title="清除解锁状态，下次进入需重新输入口令"
    >
      <Lock size={14} /> {pending ? '上锁中……' : '立即上锁'}
    </button>
  );
}
