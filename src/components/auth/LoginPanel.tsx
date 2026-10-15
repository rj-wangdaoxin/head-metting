'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ScrollCard } from '@/components/ink/ScrollCard';
import { loginAction, registerAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

export interface LoginUser {
  id: string;
  name: string;
}

export function LoginPanel({
  users,
  next,
  allowSignup = true,
}: {
  users: LoginUser[];
  next: string;
  allowSignup?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>(
    allowSignup && users.length === 0 ? 'register' : 'login',
  );
  const [name, setName] = useState(users[0]?.name ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit() {
    setBusy(true);
    setError(null);
    const result = isRegister
      ? await registerAction({ name, password, confirm })
      : await loginAction({ name, password });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[420px] px-6 py-16">
      <div className="mb-7 text-center">
        <span
          className="inline-flex h-14 w-14 items-center justify-center border-2 border-cinnabar font-serif text-2xl font-bold text-cinnabar"
          style={{ borderRadius: 4, boxShadow: '0 3px 10px rgba(158,59,46,.22)' }}
        >
          史
        </span>
        <h1 className="mt-4 font-serif text-2xl font-bold tracking-[0.15em] text-ink">青史群贤</h1>
        <p className="mt-1.5 text-[13px] text-ink-mute">
          {isRegister ? '另立一号，自成一格的数据天地' : '验明身份，方入群贤之列'}
        </p>
      </div>

      <ScrollCard className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="account" className="ink-label mb-1.5 block">
              账号
            </label>
            <input
              id="account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              placeholder="你的名号"
              className="ink-input"
            />
            {!isRegister && users.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setName(u.name)}
                    className={cn(
                      'rounded-sm border px-2 py-0.5 text-[11px] transition-all duration-200 active:scale-[0.97]',
                      u.name === name
                        ? 'border-cinnabar bg-cinnabar/10 text-cinnabar'
                        : 'border-paper-line bg-white/50 text-ink-mute hover:border-ink/30 hover:text-ink',
                    )}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="ink-label mb-1.5 block">
              口令
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={isRegister ? '至少六位' : '你的口令'}
              className="ink-input"
            />
          </div>

          {isRegister ? (
            <div>
              <label htmlFor="confirm" className="ink-label mb-1.5 block">
                再输一遍
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="确认口令"
                className="ink-input"
              />
            </div>
          ) : null}

          {error ? <p className="text-xs text-cinnabar">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="ink-btn ink-btn-primary w-full justify-center disabled:opacity-60"
          >
            {busy ? '请稍候……' : isRegister ? '立此账号' : '入座'}
          </button>
        </form>

        <div className="mt-5 border-t border-paper-line pt-4 text-center">
          {allowSignup ? (
            <button
              type="button"
              onClick={() => {
                setMode(isRegister ? 'login' : 'register');
                setError(null);
                setPassword('');
                setConfirm('');
              }}
              className="text-xs text-indigo hover:underline"
            >
              {isRegister ? '已有账号，回去入座' : '另立新账号'}
            </button>
          ) : (
            <p className="text-xs text-ink-mute">本站不开放新立账号，账号由站长分发</p>
          )}
          <p className="mt-3 text-[11px] leading-5 text-ink/45">
            各账号的分身、辩录与后台配置互相隔离，彼此看不见。
          </p>
        </div>
      </ScrollCard>
    </div>
  );
}
